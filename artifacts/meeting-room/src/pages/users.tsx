import { useListUsers, getListUsersQueryKey } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Shield, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Users() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && user.role !== "admin") {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const { data: users, isLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey(), enabled: user?.role === "admin" }
  });

  if (user?.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ユーザー管理</h1>
        <p className="text-muted-foreground mt-1">システムを利用するユーザーのアカウントを管理します。</p>
      </div>

      <div className="bg-card rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>メールアドレス</TableHead>
              <TableHead>権限</TableHead>
              <TableHead>登録日</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">読み込み中...</TableCell>
              </TableRow>
            ) : users && users.length > 0 ? (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {u.name.charAt(0)}
                      </div>
                      {u.name}
                    </div>
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    {u.role === "admin" ? (
                      <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                        <Shield className="w-3 h-3 mr-1" />
                        管理者
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <UserIcon className="w-3 h-3 mr-1" />
                        一般ユーザー
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(u.createdAt), "yyyy/MM/dd", { locale: ja })}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  ユーザーがいません。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
