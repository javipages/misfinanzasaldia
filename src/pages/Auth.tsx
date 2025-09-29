import { useState } from "react";
import { useAuth } from "@/contexts/useAuth";
import type { AuthContextType } from "@/contexts/auth-context";
// import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
// OTP functionality commented out - uncomment when needed
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  //CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// OTP functionality commented out - uncomment when needed
// CardFooter,
import {
  AlertCircle,
  Sparkles,
  TrendingUp,
  Shield,
  CheckCircle,
} from "lucide-react";
// OTP functionality commented out - uncomment when needed
// Mail,
// OTP functionality commented out - uncomment when needed
// import { Separator } from "@/components/ui/separator";

const Auth = () => {
  // OTP functionality commented out - uncomment when needed
  // const [email, setEmail] = useState("");
  // const [sent, setSent] = useState(false);
  // const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const auth = useAuth() as AuthContextType;

  // OTP functionality commented out - uncomment when needed
  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setLoading(true);
  //   setError("");
  //
  //   const { error } = await auth.sendMagicLink(email);
  //   if (error) {
  //     setError("No pudimos enviar el enlace. Revisa el correo e inténtalo.");
  //   } else {
  //     setSent(true);
  //   }
  //
  //   setLoading(false);
  // };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError("");

    const { error } = await auth.signInWithGoogle();
    if (error) {
      setError("Error al iniciar sesión con Google. Inténtalo de nuevo.");
      setGoogleLoading(false);
    }
    // No need to set loading to false here as the page will redirect
  };

  // OTP functionality commented out - uncomment when needed
  // Sin reenvío programado; el usuario puede presionar "Enviar enlace" de nuevo

  return (
    <div className="min-h-screen flex">
      {/* Left side - Marketing content */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-50 via-amber-50 to-emerald-50 p-12 flex-col justify-center relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-32 h-32 bg-white rounded-full"></div>
          <div className="absolute top-40 right-32 w-24 h-24 bg-white rounded-full"></div>
          <div className="absolute bottom-32 left-40 w-20 h-20 bg-white rounded-full"></div>
          <div className="absolute bottom-20 right-20 w-28 h-28 bg-white rounded-full"></div>
        </div>

        <div className="relative z-10 text-gray-800">
          {/* Logo */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <h1 className="text-2xl font-bold">Mis Finanzas al Día</h1>
            </div>
          </div>

          {/* Main heading */}
          <div className="mb-12">
            <h2 className="text-4xl font-bold mb-4 leading-tight">
              Toma el control de tus finanzas
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              Gestiona tus ingresos, gastos e inversiones de forma inteligente y
              alcanza tus metas financieras
            </p>
          </div>

          {/* Features */}
          <div className="space-y-6 mb-12">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <Shield className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">100% Seguro</h3>
                <p className="text-gray-600">
                  Tus datos están protegidos con las mejores prácticas de
                  seguridad
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <Sparkles className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Gestión Sencilla</h3>
                <p className="text-gray-600">
                  Organiza tus finanzas de manera fácil e intuitiva
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <CheckCircle className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">
                  Sin complicaciones
                </h3>
                <p className="text-gray-600">
                  Interfaz intuitiva diseñada para hacer la gestión financiera
                  fácil
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}

          <Card className="shadow-2xl border-0">
            <CardHeader className="space-y-1 pb-8">
              <div className="flex items-center justify-center mx-auto mb-4rounded-2xl">
                <img
                  src="/logo.png"
                  alt="Mis Finanzas al Día"
                  className="w-24"
                />
              </div>
              <CardTitle className="text-2xl font-bold text-center text-gray-900">
                Iniciar sesión
              </CardTitle>
              {/* <CardDescription className="text-center text-gray-600">
                Elige cómo quieres acceder a tu cuenta
              </CardDescription> */}
            </CardHeader>

            {/* OTP functionality commented out - uncomment when needed */}
            {/* <form onSubmit={handleSubmit}> */}
            <CardContent className="space-y-6">
              {error && (
                <div className="flex items-center gap-3 p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* Google Sign In Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base font-semibold border-2 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    Conectando...
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continuar con Google
                  </div>
                )}
              </Button>

              {/* OTP functionality commented out - uncomment when needed */}
              {/* <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-4 text-gray-500 font-medium">
                      O con correo electrónico
                    </span>
                  </div>
                </div> */}

              {/* OTP functionality commented out - uncomment when needed */}
              {/* <div className="space-y-3">
                  <Label
                    htmlFor="email"
                    className="text-sm font-semibold text-gray-700"
                  >
                    Correo electrónico
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Introduce tu correo electrónico"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-12 h-12 text-base border-2 focus:border-orange-400 focus:ring-0"
                      required
                      disabled={sent}
                    />
                  </div>
                </div> */}
            </CardContent>

            {/* OTP functionality commented out - uncomment when needed */}
            {/* <CardFooter className="pt-6">
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-orange-400 to-emerald-500 hover:from-orange-500 hover:to-emerald-600 border-0"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Enviando enlace...
                    </div>
                  ) : sent ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Enlace enviado
                    </div>
                  ) : (
                    "Enviar enlace mágico"
                  )}
                </Button>
              </CardFooter> */}
            {/* </form> */}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;
