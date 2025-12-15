import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MessageSquarePlus, Send, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Category = "feature" | "bug" | "improvement" | "other";

export function SuggestionButton() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Category>("improvement");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("suggestions")
        .insert({
          user_id: user.id,
          content: content.trim(),
          category,
        });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        setContent("");
        setCategory("improvement");
        setSuccess(false);
        setOpen(false);
      }, 1500);
    } catch (error) {
      console.error("Error submitting suggestion:", error);
      alert("Error al enviar la sugerencia. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50"
        onClick={() => setOpen(true)}
        title="Enviar sugerencia"
      >
        <MessageSquarePlus className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5" />
              Enviar Sugerencia
            </DialogTitle>
            <DialogDescription>
              ¿Tienes una idea, encontraste un bug o quieres mejorar algo? ¡Cuéntanos!
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <p className="text-lg font-medium">¡Gracias por tu sugerencia!</p>
              <p className="text-sm text-muted-foreground">La revisaremos pronto.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feature">💡 Nueva funcionalidad</SelectItem>
                      <SelectItem value="bug">🐛 Reportar bug</SelectItem>
                      <SelectItem value="improvement">✨ Mejora</SelectItem>
                      <SelectItem value="other">📝 Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="content">Tu sugerencia</Label>
                  <Textarea
                    id="content"
                    placeholder="Describe tu sugerencia aquí..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={5}
                    className="resize-none"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !content.trim()}
                >
                  {isSubmitting ? (
                    "Enviando..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
