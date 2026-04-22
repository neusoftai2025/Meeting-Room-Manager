import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { useLogin } from "@workspace/api-client-react";
import { Building2, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const loginSchema = z.object({
  email: z.string().email({ message: "有効なメールアドレスを入力してください" }),
  password: z.string().min(1, { message: "パスワードを入力してください" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, refreshUser } = useAuth();
  const loginMutation = useLogin();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(
      { data },
      {
        onSuccess: () => {
          refreshUser();
          toast({
            title: "ログイン成功",
            description: "ダッシュボードに移動します。",
          });
          setLocation("/dashboard");
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "ログイン失敗",
            description: error?.response?.data?.error || "メールアドレスまたはパスワードが間違っています。",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-card shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 relative">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center space-y-4 text-center mb-10">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">会議室予約システム</h1>
              <p className="text-sm text-muted-foreground mt-2">
                社内アカウントでログインしてください
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-foreground">メールアドレス</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="taro.yamada@example.com"
                        type="email"
                        autoComplete="email"
                        className="h-12 bg-background border-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold text-foreground">パスワード</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="••••••••"
                        type="password"
                        autoComplete="current-password"
                        className="h-12 bg-background border-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-12 text-base font-bold shadow-md hover:shadow-lg transition-all"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ログイン中...
                  </>
                ) : (
                  "ログイン"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>

      {/* Right side - Decorative/Branding */}
      <div className="hidden lg:flex w-1/2 bg-primary flex-col justify-center items-center relative overflow-hidden">
        {/* Subtle background patterns */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djIwaC0ydi0yMEgzNHYyMGgtMnYtMjBoLTJ2MjBoLTJ2LTIwSDI2djIwaC0ydjIwaC0ydjIwaC0ydjIwSDIwaC0ydjIwSDE4djIwSDE2djIwSDE0djIwaC0ydjIwSDEwdjIwaC0ydjIwSDZ2MjBINC0ydjIwaC0ydjIwSDJ2MjBINHYyMGgydjIwaDJ2MjBoMnYyMGgydjIwaDJ2MjBoMnYyMGgydjIwaDJ2MjBoMnYyMGgydjIwaDJ2MjBoMnYyMGgydjIwaDJ2MjBoMnYyMGgydjIwaDJ2MjBoMnYyMGgydjIwaDJ2MjBoMnYyMGgydjIwaDJ2MjBoMnYyMGgydjIwaDJ2MjB6Ii8+PC9nPjwvZz48L3N2Zz4=')]"></div>
        <div className="relative z-10 text-primary-foreground text-center p-12 max-w-lg">
          <div className="mb-8 flex justify-center">
            <div className="w-24 h-24 bg-white/10 rounded-3xl backdrop-blur-sm flex items-center justify-center">
              <Calendar className="w-12 h-12 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4 tracking-tight">スマートな会議室予約</h2>
          <p className="text-primary-foreground/80 leading-relaxed text-lg">
            全社のアセットを効率的に活用し、スムーズなミーティングを実現します。空き状況の確認から予約まで、すべてがワンストップで完結。
          </p>
        </div>
      </div>
    </div>
  );
}
