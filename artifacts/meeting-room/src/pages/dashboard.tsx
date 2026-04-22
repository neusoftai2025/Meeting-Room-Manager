import { useGetDashboardSummary, useGetTodayReservations, useGetRoomUtilization, getGetDashboardSummaryQueryKey, getGetTodayReservationsQueryKey, getGetRoomUtilizationQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Calendar, Users, Clock, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary, error: summaryError } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() }
  });
  const { data: todayReservations, isLoading: isLoadingToday, error: todayError } = useGetTodayReservations({
    query: { queryKey: getGetTodayReservationsQueryKey() }
  });
  const { data: utilization, isLoading: isLoadingUtil, error: utilError } = useGetRoomUtilization({
    query: { queryKey: getGetRoomUtilizationQueryKey() }
  });

  const isLoading = isLoadingSummary || isLoadingToday || isLoadingUtil;
  const error = summaryError || todayError || utilError;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>エラー</AlertTitle>
        <AlertDescription>
          データの読み込みに失敗しました。後でもう一度お試しください。
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
        <p className="text-muted-foreground mt-1">本日の予約状況と会議室の利用状況を確認できます。</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">登録会議室数</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{summary?.totalRooms || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">本日の予約数</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{summary?.todayReservations || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今後の予約数</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{summary?.upcomingReservations || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">アクティブユーザー</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{summary?.activeUsers || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Today's Reservations */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>本日の予約</CardTitle>
            <CardDescription>
              今日予定されている会議の一覧
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : todayReservations && todayReservations.length > 0 ? (
              <div className="space-y-4">
                {todayReservations.map((res) => (
                  <div key={res.id} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">{res.title}</p>
                      <div className="flex items-center text-sm text-muted-foreground gap-2 mt-1">
                        <span>{res.room?.name}</span>
                        <span>•</span>
                        <span>
                          {new Date(res.startTime).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                          {" - "}
                          {new Date(res.endTime).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {res.user?.name}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                本日の予約はありません
              </div>
            )}
          </CardContent>
        </Card>

        {/* Room Utilization */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>会議室利用状況</CardTitle>
            <CardDescription>
              各会議室の総予約時間と件数（今月）
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : utilization && utilization.length > 0 ? (
              <div className="space-y-4">
                {utilization.map((util) => (
                  <div key={util.roomId} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{util.roomName}</p>
                      <p className="text-sm text-muted-foreground">{util.reservationCount} 件の予約</p>
                    </div>
                    <div className="font-bold">
                      {util.totalHours} 時間
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                利用データがありません
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
