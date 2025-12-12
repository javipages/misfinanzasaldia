import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/useAuth";

const SettingsBinance = () => {
  useAuth(); // Ensures user is authenticated
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
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
      // Note: binance_config table needs migration to be applied first
      // Using type assertion since table may not exist in generated types yet
      const { data } = await (supabase
        .from("binance_config" as any)
        .select("last_sync_at")
        .single() as any);

      if (data) {
        setLastSync(data.last_sync_at);
        setHasConfig(true);
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
      const { data, error } = await supabase.functions.invoke("save-binance-config", {
        body: {
          api_key: apiKey,
          api_secret: apiSecret,
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
      const { data, error } = await supabase.functions.invoke("sync-binance", {
        body: {},
      });

      if (error) throw error;

      if (data.success) {
        setMessage({
          type: "success",
          text: `✅ Sincronización completa: ${data.created} creadas, ${data.updated} actualizadas ($${data.totalValueUSD?.toFixed(2) || 0} total)`,
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
        <h2 className="text-2xl font-bold">Configuración Binance</h2>
        <p className="text-muted-foreground">
          Conecta tu cuenta de Binance
        </p>
      </div>

      {/* Instructions */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Cómo obtener tu API Key y Secret:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
            <li>Ve a Binance → Account → API Management</li>
            <li>Crea una nueva API Key (con permisos de lectura)</li>
            <li>
              <strong>Importante:</strong> Solo habilita "Read" permission, no "Trade" ni "Withdraw"
            </li>
            <li>Copia el API Key y Secret Key</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Security Warning */}
      <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-900 dark:text-yellow-100">
          🔒 <strong>Seguridad:</strong> Tus credenciales se encriptan antes de guardarse. 
          Nunca las compartimos ni las usamos para operaciones de trading.
        </AlertDescription>
      </Alert>

      {/* Config Form */}
      <Card>
        <CardHeader>
          <CardTitle>Credenciales Binance</CardTitle>
          <CardDescription>
            Tus credenciales se guardan de forma segura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveConfig} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  hasConfig
                    ? "API Key guardada (introduce una nueva para actualizar)"
                    : "Tu API Key de Binance"
                }
                required={!hasConfig}
              />
              {hasConfig && (
                <p className="text-xs text-muted-foreground">
                  Las credenciales están encriptadas. Deja en blanco si no quieres cambiarlas.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiSecret">API Secret</Label>
              <Input
                id="apiSecret"
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder={
                  hasConfig
                    ? "API Secret guardado (introduce uno nuevo para actualizar)"
                    : "Tu API Secret de Binance"
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
                  Sincronizando con Binance...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sincronizar Ahora
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              Esto traerá tus balances actuales desde Binance a la página de Inversiones.
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
      {hasConfig && !lastSync && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">✨ Próximos pasos</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>1. Haz clic en "Sincronizar Ahora" para traer tus balances</p>
            <p>2. Ve a la página de Inversiones para ver tus crypto</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SettingsBinance;
