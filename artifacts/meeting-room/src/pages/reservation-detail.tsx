import { useLocation, useParams, Link } from "wouter";
import { useGetReservation, useUpdateReservation, useDeleteReservation, getGetReservationQueryKey, getListReservationsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, MapPin, Users, FileText, Trash2, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/auth-context";

export default function ReservationDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const reservationId = Number(id);

  const { data: reservation, isLoading, error } = useGetReservation(reservationId, {
    query: { enabled: !!reservationId, queryKey: getGetReservationQueryKey(reservationId) }
  });

  const updateMutation = useUpdateReservation();
  const deleteMutation = useDeleteReservation();

  if (isLoading) {
    return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>;
  }

  if (error || !reservation) {
    return <div className="p-8 text-center text-destructive">予約が見つかりません。</div>;
  }

  const isConfirmed = reservation.status === "confirmed";
  const isPast = new Date(reservation.endTime) < new Date();
  const canModify = (user?.role === "admin" || user?.id === reservation.userId) && !isPast && isConfirmed;

  const handleCancel = () => {
    updateMutation.mutate(
      { id: reservationId, data: { status: "cancelled" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetReservationQueryKey(reservationId) });
          queryClient.invalidateQueries({ queryKey: getListReservationsQueryKey() });
          toast({ title: "予約をキャンセルしました" });
        },
        onError: () => {
          toast({ variant: "destructive", title: "キャンセルに失敗しました" });
        }
      }
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(
      { id: reservationId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReservationsQueryKey() });
          toast({ title: "予約を削除しました" });
          setLocation("/reservations");
        },
        onError: () => {
          toast({ variant: "destructive", title: "削除に失敗しました" });
        }
      }
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/reservations")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">予約詳細</h1>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-start">
          <div>
            <CardTitle className="text-2xl mb-2">{reservation.title}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>予約者: {reservation.user.name}</span>
              <span>•</span>
              <span>作成日: {format(new Date(reservation.createdAt), "yyyy/MM/dd HH:mm")}</span>
            </div>
          </div>
          <Badge variant={isConfirmed ? "default" : "secondary"} className="text-sm px-3 py-1">
            {isConfirmed ? "予約確定" : "キャンセル済"}
          </Badge>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <Calendar className="w-4 h-4 mr-2" />
                日付
              </div>
              <div className="font-medium text-lg">
                {format(new Date(reservation.startTime), "yyyy年MM月dd日 (E)", { locale: ja })}
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <Clock className="w-4 h-4 mr-2" />
                時間
              </div>
              <div className="font-medium text-lg">
                {format(new Date(reservation.startTime), "HH:mm")} - {format(new Date(reservation.endTime), "HH:mm")}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <MapPin className="w-4 h-4 mr-2" />
                会議室
              </div>
              <div className="font-medium text-lg">
                <Link href={`/rooms/${reservation.roomId}`} className="text-primary hover:underline">
                  {reservation.room.name}
                </Link>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center text-sm font-medium text-muted-foreground mb-1">
                <Users className="w-4 h-4 mr-2" />
                参加人数
              </div>
              <div className="font-medium text-lg">
                {reservation.attendees ? `${reservation.attendees}名` : "未定"}
              </div>
            </div>
          </div>

          {reservation.description && (
            <div className="space-y-2">
              <div className="flex items-center text-sm font-medium text-muted-foreground">
                <FileText className="w-4 h-4 mr-2" />
                備考
              </div>
              <div className="p-4 bg-background border rounded-md text-sm whitespace-pre-wrap">
                {reservation.description}
              </div>
            </div>
          )}
        </CardContent>

        {(canModify || user?.role === "admin") && (
          <CardFooter className="flex justify-end gap-4 pt-4 border-t bg-muted/10">
            {canModify && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20">
                    <XCircle className="w-4 h-4 mr-2" />
                    予約をキャンセル
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>予約をキャンセルしますか？</AlertDialogTitle>
                    <AlertDialogDescription>
                      この操作は取り消せません。キャンセルすると、この会議室は他のユーザーが予約できるようになります。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>戻る</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      キャンセルを確定
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {user?.role === "admin" && (
               <AlertDialog>
               <AlertDialogTrigger asChild>
                 <Button variant="destructive">
                   <Trash2 className="w-4 h-4 mr-2" />
                   削除 (管理者)
                 </Button>
               </AlertDialogTrigger>
               <AlertDialogContent>
                 <AlertDialogHeader>
                   <AlertDialogTitle>データを完全に削除しますか？</AlertDialogTitle>
                   <AlertDialogDescription>
                     予約データをシステムから完全に削除します。この操作は取り消せません。
                   </AlertDialogDescription>
                 </AlertDialogHeader>
                 <AlertDialogFooter>
                   <AlertDialogCancel>戻る</AlertDialogCancel>
                   <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                     完全に削除
                   </AlertDialogAction>
                 </AlertDialogFooter>
               </AlertDialogContent>
             </AlertDialog>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
