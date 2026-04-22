import { useParams, Link } from "wouter";
import { useGetRoom, useListReservations, getGetRoomQueryKey, getListReservationsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, MapPin, Calendar as CalendarIcon, Plus } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import { useState } from "react";

export default function RoomDetail() {
  const { id } = useParams<{ id: string }>();
  const roomId = Number(id);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Start on Monday

  const { data: room, isLoading: roomLoading } = useGetRoom(roomId, {
    query: { enabled: !!roomId, queryKey: getGetRoomQueryKey(roomId) }
  });

  // Get reservations for the week
  const startDateStr = format(currentWeekStart, "yyyy-MM-dd");
  const endDateStr = format(addDays(currentWeekStart, 6), "yyyy-MM-dd");
  
  const { data: reservations, isLoading: resLoading } = useListReservations(
    { roomId, startDate: startDateStr, endDate: endDateStr },
    { query: { enabled: !!roomId, queryKey: getListReservationsQueryKey({ roomId, startDate: startDateStr, endDate: endDateStr }) } }
  );

  const prevWeek = () => setCurrentWeekStart(prev => addDays(prev, -7));
  const nextWeek = () => setCurrentWeekStart(prev => addDays(prev, 7));

  if (roomLoading) {
    return <div className="p-8">読み込み中...</div>;
  }

  if (!room) {
    return <div className="p-8 text-destructive">会議室が見つかりません。</div>;
  }

  // Generate week days
  const weekDays = Array.from({ length: 5 }).map((_, i) => addDays(currentWeekStart, i)); // Just Monday-Friday for corporate

  // Generate time slots (9:00 to 18:00)
  const timeSlots = Array.from({ length: 10 }).map((_, i) => 9 + i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{room.name}</h1>
          </div>
        </div>
        <Link href={`/reservations/new?roomId=${room.id}`}>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            この部屋を予約
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Room Info */}
        <Card className="col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>定員: {room.capacity}名</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>場所: {room.location}</span>
            </div>
            
            {room.description && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground">{room.description}</p>
              </div>
            )}

            {room.amenities && (
              <div className="pt-2 border-t space-y-2">
                <span className="text-xs font-medium text-muted-foreground">設備</span>
                <div className="flex flex-wrap gap-1">
                  {room.amenities.split(',').map((a, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{a.trim()}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Availability Calendar (Simplified) */}
        <Card className="col-span-1 md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              空き状況カレンダー
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={prevWeek}>先週</Button>
              <span className="text-sm font-medium w-32 text-center">
                {format(currentWeekStart, "yyyy年MM月")}
              </span>
              <Button variant="outline" size="sm" onClick={nextWeek}>来週</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-r p-2 w-16 bg-muted/30"></th>
                    {weekDays.map(day => (
                      <th key={day.toISOString()} className="border-b border-r p-2 font-medium text-center bg-muted/10">
                        <div>{format(day, "E", { locale: ja })}</div>
                        <div className="text-lg">{format(day, "d")}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map(hour => (
                    <tr key={hour}>
                      <td className="border-b border-r p-2 text-center text-xs text-muted-foreground font-medium bg-muted/10">
                        {hour}:00
                      </td>
                      {weekDays.map(day => {
                        // Very simple overlap check for the hour block
                        const slotStart = new Date(day);
                        slotStart.setHours(hour, 0, 0, 0);
                        
                        const slotEnd = new Date(day);
                        slotEnd.setHours(hour + 1, 0, 0, 0);

                        const resInSlot = reservations?.find(r => {
                          const rStart = new Date(r.startTime);
                          const rEnd = new Date(r.endTime);
                          return r.status === "confirmed" && (
                            (rStart < slotEnd && rEnd > slotStart) // Overlaps
                          );
                        });

                        return (
                          <td key={day.toISOString()} className="border-b border-r p-0 relative h-12">
                            {resInSlot ? (
                              <div className="absolute inset-1 bg-primary/20 border border-primary/30 rounded px-1 py-0.5 text-xs overflow-hidden flex flex-col justify-center cursor-pointer hover:bg-primary/30 transition-colors" title={resInSlot.title}>
                                <span className="font-semibold text-primary truncate leading-tight">{resInSlot.title}</span>
                                <span className="text-[10px] text-primary/70 truncate leading-tight">{resInSlot.user?.name}</span>
                              </div>
                            ) : (
                              <div className="w-full h-full hover:bg-muted/30 transition-colors cursor-crosshair group relative">
                                <Link href={`/reservations/new?roomId=${room.id}&date=${format(day, "yyyy-MM-dd")}&time=${hour}:00`} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <Plus className="w-4 h-4 text-muted-foreground" />
                                </Link>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
