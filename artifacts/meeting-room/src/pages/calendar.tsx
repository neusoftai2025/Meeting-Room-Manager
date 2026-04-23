import { useState, useRef, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, subDays, startOfDay, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight, X, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListRooms,
  useListReservations,
  useCreateReservation,
  getListReservationsQueryKey,
  getListRoomsQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const SLOT_HEIGHT = 40;
const SLOTS_PER_HOUR = 2;
const TOTAL_SLOTS = 24 * SLOTS_PER_HOUR;
const TIME_COL_WIDTH = 60;

function slotToTime(slot: number): string {
  const h = Math.floor(slot / SLOTS_PER_HOUR);
  const m = (slot % SLOTS_PER_HOUR) * 30;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function slotToDate(date: Date, slot: number): Date {
  const h = Math.floor(slot / SLOTS_PER_HOUR);
  const m = (slot % SLOTS_PER_HOUR) * 30;
  const d = startOfDay(new Date(date));
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToSlot(date: Date): number {
  return date.getHours() * SLOTS_PER_HOUR + (date.getMinutes() >= 30 ? 1 : 0);
}

interface Selection {
  roomId: number;
  startSlot: number;
  endSlot: number;
}

const reservationSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください"),
  description: z.string().optional(),
  attendees: z.string().optional(),
});
type ReservationFormData = z.infer<typeof reservationSchema>;

export default function Calendar() {
  const today = startOfDay(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<Selection | null>(null);
  const isDragging = useRef(false);
  const dragRoomId = useRef<number | null>(null);
  const dragStartSlot = useRef<number | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: rooms } = useListRooms({ query: { queryKey: getListRoomsQueryKey() } });
  const { data: reservations } = useListReservations(
    { date: dateStr },
    { query: { queryKey: getListReservationsQueryKey({ date: dateStr }) } }
  );

  const createReservation = useCreateReservation();

  const form = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: { title: "", description: "", attendees: "" },
  });

  const activeRooms = rooms?.filter((r) => r.isActive) ?? [];

  const getReservationsForRoom = useCallback(
    (roomId: number) => {
      if (!reservations) return [];
      return reservations.filter(
        (r) => r.roomId === roomId && r.status === "confirmed"
      );
    },
    [reservations]
  );

  const handleCellMouseDown = useCallback(
    (e: React.MouseEvent, roomId: number, slot: number) => {
      e.preventDefault();
      isDragging.current = true;
      dragRoomId.current = roomId;
      dragStartSlot.current = slot;
      setSelection({ roomId, startSlot: slot, endSlot: slot + 1 });
    },
    []
  );

  const handleCellMouseEnter = useCallback((roomId: number, slot: number) => {
    if (!isDragging.current || dragRoomId.current !== roomId) return;
    const start = dragStartSlot.current!;
    setSelection({
      roomId,
      startSlot: Math.min(start, slot),
      endSlot: Math.max(start, slot) + 1,
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current || !selection) {
      isDragging.current = false;
      return;
    }
    isDragging.current = false;
    dragRoomId.current = null;
    dragStartSlot.current = null;

    setPendingSelection(selection);
    form.reset({ title: "", description: "", attendees: "" });
    setDialogOpen(true);
  }, [selection, form]);

  useEffect(() => {
    const onMouseUp = () => {
      if (isDragging.current) handleMouseUp();
    };
    window.addEventListener("mouseup", onMouseUp);
    return () => window.removeEventListener("mouseup", onMouseUp);
  }, [handleMouseUp]);

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelection(null);
    setPendingSelection(null);
    form.reset();
  };

  const onSubmit = async (data: ReservationFormData) => {
    if (!pendingSelection) return;

    const startTime = slotToDate(selectedDate, pendingSelection.startSlot);
    const endTime = slotToDate(selectedDate, pendingSelection.endSlot);

    createReservation.mutate(
      {
        data: {
          roomId: pendingSelection.roomId,
          title: data.title,
          description: data.description || undefined,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          attendees: data.attendees ? parseInt(data.attendees) : undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListReservationsQueryKey({ date: dateStr }),
          });
          toast({ title: "予約が完了しました", description: data.title });
          handleDialogClose();
        },
        onError: (err: unknown) => {
          const msg =
            (err as { data?: { error?: string } })?.data?.error ??
            "予約の登録に失敗しました";
          toast({ title: "エラー", description: msg, variant: "destructive" });
        },
      }
    );
  };

  const selectedRoom = activeRooms.find(
    (r) => r.id === (pendingSelection?.roomId ?? selection?.roomId)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate((d) => subDays(d, 1))}
            className="p-1.5 rounded hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h2 className="text-lg font-semibold min-w-[180px] text-center">
            {format(selectedDate, "yyyy年M月d日（E）", { locale: ja })}
          </h2>
          <button
            onClick={() => setSelectedDate((d) => addDays(d, 1))}
            className="p-1.5 rounded hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <Button
          variant={isSameDay(selectedDate, today) ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedDate(today)}
        >
          今日
        </Button>
      </div>

      {/* Calendar grid container */}
      <div
        className="flex-1 overflow-auto border rounded-lg bg-card select-none"
        style={{ minHeight: 0 }}
        onMouseLeave={() => {
          if (isDragging.current) handleMouseUp();
        }}
      >
        {/* Sticky header row (room names) */}
        <div className="sticky top-0 z-20 bg-card border-b flex">
          {/* Time gutter */}
          <div
            className="flex-shrink-0 border-r bg-card"
            style={{ width: TIME_COL_WIDTH }}
          />
          {activeRooms.map((room, i) => (
            <div
              key={room.id}
              className={`flex-1 min-w-[140px] px-3 py-2 border-r last:border-r-0 ${i === 0 ? "" : ""}`}
            >
              <div className="font-semibold text-sm text-foreground">{room.name}</div>
              <div className="text-xs text-muted-foreground">定員{room.capacity}名</div>
            </div>
          ))}
        </div>

        {/* Time rows */}
        <div className="flex relative">
          {/* Time labels column */}
          <div
            className="flex-shrink-0 border-r"
            style={{ width: TIME_COL_WIDTH }}
          >
            {Array.from({ length: TOTAL_SLOTS }, (_, slot) => {
              const isHour = slot % SLOTS_PER_HOUR === 0;
              return (
                <div
                  key={slot}
                  style={{ height: SLOT_HEIGHT }}
                  className={`flex items-start justify-end pr-2 pt-0.5 ${
                    isHour ? "border-t border-border" : "border-t border-border/30"
                  }`}
                >
                  {isHour && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {slotToTime(slot)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Room columns */}
          {activeRooms.map((room) => {
            const roomReservations = getReservationsForRoom(room.id);
            const isSelecting =
              selection !== null && selection.roomId === room.id;
            const selStart = isSelecting ? selection.startSlot : 0;
            const selEnd = isSelecting ? selection.endSlot : 0;

            return (
              <div
                key={room.id}
                className="flex-1 min-w-[140px] relative border-r last:border-r-0"
              >
                {/* Slot cells */}
                {Array.from({ length: TOTAL_SLOTS }, (_, slot) => {
                  const isHour = slot % SLOTS_PER_HOUR === 0;
                  const inSelection =
                    isSelecting && slot >= selStart && slot < selEnd;
                  return (
                    <div
                      key={slot}
                      data-room={room.id}
                      data-slot={slot}
                      style={{ height: SLOT_HEIGHT }}
                      className={`border-r-0 cursor-pointer transition-colors ${
                        isHour
                          ? "border-t border-border"
                          : "border-t border-border/30"
                      } ${
                        inSelection
                          ? "bg-sky-200 dark:bg-sky-800"
                          : "hover:bg-muted/40"
                      }`}
                      onMouseDown={(e) => handleCellMouseDown(e, room.id, slot)}
                      onMouseEnter={() => handleCellMouseEnter(room.id, slot)}
                    />
                  );
                })}

                {/* Existing reservations overlaid */}
                {roomReservations.map((res) => {
                  const start = dateToSlot(new Date(res.startTime));
                  const end = dateToSlot(new Date(res.endTime));
                  const slotSpan = Math.max(end - start, 1);
                  const top = start * SLOT_HEIGHT;
                  const height = slotSpan * SLOT_HEIGHT - 2;
                  const startStr = format(new Date(res.startTime), "HH:mm");
                  const endStr = format(new Date(res.endTime), "HH:mm");
                  return (
                    <div
                      key={res.id}
                      className="absolute left-0.5 right-0.5 rounded bg-blue-500 text-white px-2 py-1 overflow-hidden pointer-events-none z-10"
                      style={{ top: top + 1, height }}
                    >
                      <div className="text-xs font-bold leading-tight truncate">
                        {startStr}
                      </div>
                      <div className="text-xs leading-tight truncate">
                        {res.user.name}
                      </div>
                      <div className="text-xs leading-tight truncate opacity-90">
                        {startStr} - {endStr}
                      </div>
                      {height > 70 && (
                        <div className="text-xs leading-tight truncate opacity-80 mt-0.5">
                          {res.title}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Booking Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>会議室予約</DialogTitle>
          </DialogHeader>

          {pendingSelection && selectedRoom && (
            <div className="bg-muted rounded-lg px-4 py-3 mb-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">会議室</span>
                <span className="font-medium">{selectedRoom.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">日付</span>
                <span className="font-medium">
                  {format(selectedDate, "yyyy年M月d日（E）", { locale: ja })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">時間</span>
                <span className="font-medium">
                  {slotToTime(pendingSelection.startSlot)} 〜{" "}
                  {slotToTime(pendingSelection.endSlot)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">定員</span>
                <span className="font-medium">{selectedRoom.capacity}名</span>
              </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>会議タイトル <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例）週次ミーティング"
                        data-testid="input-title"
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>内容・備考</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="会議の内容や備考を入力（任意）"
                        rows={2}
                        data-testid="input-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="attendees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>参加人数</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={selectedRoom?.capacity}
                        placeholder="例）5"
                        data-testid="input-attendees"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDialogClose}
                  data-testid="button-cancel"
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  disabled={createReservation.isPending}
                  data-testid="button-submit"
                >
                  {createReservation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      登録中...
                    </>
                  ) : (
                    "予約する"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
