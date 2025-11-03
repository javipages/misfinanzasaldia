import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";

const SettingsIBKR = () => {
  const { session } = useAuth();
  const [token, setToken] = useState("");
  const [queryId, setQueryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [hasConfig, setHasConfig] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("ibkr_config")
        .select("last_sync_at")
        .single();

      if (data) {
        setLastSync(data.last_sync_at);
        setHasConfig(true);
        // Note: We don't load the encrypted credentials into the form
        // They stay encrypted in the database
      }
    } catch (error) {
      // No config yet
    }
  };

  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Use the save-ibkr-config function which encrypts the data
      const { data, error } = await supabase.functions.invoke("save-ibkr-config", {
        body: {
          token,
          query_id: queryId,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Error al guardar");
      }

      setMessage({ type: "success", text: "✅ Configuración guardada (encriptada)" });
      setHasConfig(true);
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Error al guardar",
      });
    } finally {
      setLoading(false);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke("sync-ibkr", {
        body: {},
      });

      if (error) throw error;

      if (data.success) {
        setMessage({
          type: "success",
          text: `✅ Sincronización completa: ${data.created} creadas, ${data.updated} actualizadas`,
        });
        await loadConfig(); // Refresh last sync time
      } else {
        throw new Error(data.error || "Error en sincronización");
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Error al sincronizar",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Configuración IBKR</h2>
        <p className="text-muted-foreground">
          Conecta tu cuenta de Interactive Brokers
        </p>
      </div>

      {/* Instructions */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Cómo obtener tu Token y Query ID:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
            <li>Ve a IBKR Account Management</li>
            <li>Settings → Flex Web Service</li>
            <li>
              Crea un Flex Query con: Open Positions, Account Information
            </li>
            <li>Copia el Token y Query ID</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Config Form */}
      <Card>
        <CardHeader>
          <CardTitle>Credenciales IBKR</CardTitle>
          <CardDescription>
            Tus credenciales se guardan de forma segura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveConfig} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Token</Label>
              <Input
                id="token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={
                  hasConfig
                    ? "Token guardado de forma segura (introduce uno nuevo para actualizar)"
                    : "Tu token de IBKR"
                }
                required={!hasConfig}
              />
              {hasConfig && (
                <p className="text-xs text-muted-foreground">
                  Las credenciales están encriptadas en la base de datos. Deja en blanco si no quieres cambiarlas.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="queryId">Query ID</Label>
              <Input
                id="queryId"
                type="text"
                value={queryId}
                onChange={(e) => setQueryId(e.target.value)}
                placeholder={
                  hasConfig
                    ? "Query ID guardado de forma segura (introduce uno nuevo para actualizar)"
                    : "Tu Query ID de IBKR"
                }
                required={!hasConfig}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Guardar Configuración
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sync Card */}
      {hasConfig && (
        <Card>
          <CardHeader>
            <CardTitle>Sincronización</CardTitle>
            <CardDescription>
              {lastSync
                ? `Última sincronización: ${new Date(lastSync).toLocaleString("es-ES")}`
                : "Nunca sincronizado"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={syncNow}
              disabled={syncing}
              className="w-full"
              size="lg"
            >
              {syncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sincronizando con IBKR...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sincronizar Ahora
                </>
              )}
            </Button>

            <p className="text-sm text-muted-foreground">
              Esto traerá tus posiciones actuales desde IBKR y actualizará tus
              inversiones.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Next Steps */}
      {hasConfig && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">✨ Próximos pasos</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>1. Haz clic en "Sincronizar Ahora" para traer tus posiciones</p>
            <p>2. Ve a la página de Inversiones para ver tus datos</p>
            <p>
              3. Usa el botón de sincronizar en Inversiones para refrescar cuando
              quieras
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SettingsIBKR;
