import { useState } from "react";
import { useListReservations, useListRooms, getListReservationsQueryKey, getListRoomsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Plus, Search, Calendar as CalendarIcon, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function Reservations() {
  const [roomIdFilter, setRoomIdFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");

  const { data: rooms } = useListRooms({
    query: { queryKey: getListRoomsQueryKey() }
  });

  const queryParams: any = {};
  if (roomIdFilter && roomIdFilter !== "all") queryParams.roomId = Number(roomIdFilter);
  if (dateFilter) queryParams.date = dateFilter;

  const { data: reservations, isLoading } = useListReservations(queryParams, {
    query: { queryKey: getListReservationsQueryKey(queryParams) }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">予約一覧</h1>
          <p className="text-muted-foreground mt-1">すべての会議室予約を管理します。</p>
        </div>
        <Link href="/reservations/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            新規予約
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-lg border">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">絞り込み:</span>
        </div>
        
        <div className="flex-1 max-w-xs">
          <Select value={roomIdFilter} onValueChange={setRoomIdFilter}>
            <SelectTrigger>
              <SelectValue placeholder="すべての会議室" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべての会議室</SelectItem>
              {rooms?.map(room => (
                <SelectItem key={room.id} value={room.id.toString()}>{room.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 max-w-xs">
          <div className="relative">
            <Input 
              type="date" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-10"
            />
            <CalendarIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
        
        {(roomIdFilter || dateFilter) && (
          <Button variant="ghost" onClick={() => { setRoomIdFilter(""); setDateFilter(""); }}>
            クリア
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日時</TableHead>
              <TableHead>会議室</TableHead>
              <TableHead>目的・タイトル</TableHead>
              <TableHead>予約者</TableHead>
              <TableHead>参加人数</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">読み込み中...</TableCell>
              </TableRow>
            ) : reservations && reservations.length > 0 ? (
              reservations.map((res) => (
                <TableRow key={res.id}>
                  <TableCell>
                    <div className="font-medium">
                      {format(new Date(res.startTime), "yyyy/MM/dd (E)", { locale: ja })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(res.startTime), "HH:mm")} - {format(new Date(res.endTime), "HH:mm")}
                    </div>
                  </TableCell>
                  <TableCell>{res.room.name}</TableCell>
                  <TableCell className="font-medium">{res.title}</TableCell>
                  <TableCell>{res.user.name}</TableCell>
                  <TableCell>{res.attendees ? `${res.attendees}名` : "-"}</TableCell>
                  <TableCell>
                    <Badge variant={res.status === "confirmed" ? "default" : "secondary"}>
                      {res.status === "confirmed" ? "予約確定" : "キャンセル"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/reservations/${res.id}`}>
                      <Button variant="ghost" size="sm">詳細</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  予約が見つかりません。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
