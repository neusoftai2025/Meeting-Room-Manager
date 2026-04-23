import { useState, useRef, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays, subDays, startOfDay, isSameDay } from "date-fns";
import { ja } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  CalendarIcon,
  Clock,
  MapPin,
  User,
  Trash2,
  Pencil,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListRooms,
  useListReservations,
  useCreateReservation,
  useDeleteReservation,
  useUpdateReservation,
  getListReservationsQueryKey,
  getListRoomsQueryKey,
} from "@workspace/api-client-react";
import type { ReservationWithDetails } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
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

const reservationSchema = z
  .object({
    roomId: z.string().min(1, "会議室を選択してください"),
    title: z.string().min(1, "タイトルを入力してください"),
    startTime: z.string().min(1, "開始時刻を入力してください"),
    endTime: z.string().min(1, "終了時刻を入力してください"),
    description: z.string().optional(),
    attendees: z.string().optional(),
  })
  .refine((d) => d.startTime < d.endTime, {
    message: "終了時刻は開始時刻よりも後に設定してください",
    path: ["endTime"],
  });
type ReservationFormData = z.infer<typeof reservationSchema>;

const editSchema = z
  .object({
    roomId: z.string().min(1, "会議室を選択してください"),
    title: z.string().min(1, "タイトルを入力してください"),
    startTime: z.string().min(1, "開始時刻を入力してください"),
    endTime: z.string().min(1, "終了時刻を入力してください"),
    description: z.string().optional(),
  })
  .refine((d) => d.startTime < d.endTime, {
    message: "終了時刻は開始時刻よりも後に設定してください",
    path: ["endTime"],
  });
type EditFormData = z.infer<typeof editSchema>;

export default function Calendar() {
  const today = startOfDay(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<Selection | null>(null);

  // Detail modal state
  const [detailRes, setDetailRes] = useState<ReservationWithDetails | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // viewMode: 'detail' | 'edit' | 'confirmDelete'
  const [viewMode, setViewMode] = useState<"detail" | "edit" | "confirmDelete">("detail");

  const isDragging = useRef(false);
  const dragRoomId = useRef<number | null>(null);
  const dragStartSlot = useRef<number | null>(null);
  const dragMoved = useRef(false);

  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: rooms } = useListRooms({ query: { queryKey: getListRoomsQueryKey() } });
  const { data: reservations } = useListReservations(
    { date: dateStr },
    { query: { queryKey: getListReservationsQueryKey({ date: dateStr }) } }
  );

  const createReservation = useCreateReservation();
  const deleteReservation = useDeleteReservation();
  const updateReservation = useUpdateReservation();

  const form = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: { roomId: "", title: "", startTime: "", endTime: "", description: "", attendees: "" },
  });

  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: { roomId: "", title: "", startTime: "", endTime: "", description: "" },
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
      dragMoved.current = false;
      dragRoomId.current = roomId;
      dragStartSlot.current = slot;
      setSelection({ roomId, startSlot: slot, endSlot: slot + 1 });
    },
    []
  );

  const handleCellMouseEnter = useCallback((roomId: number, slot: number) => {
    if (!isDragging.current || dragRoomId.current !== roomId) return;
    dragMoved.current = true;
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
    form.reset({
      roomId: String(selection.roomId),
      title: "",
      startTime: slotToTime(selection.startSlot),
      endTime: slotToTime(selection.endSlot),
      description: "",
      attendees: "",
    });
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
    const dateBase = format(selectedDate, "yyyy-MM-dd");

    createReservation.mutate(
      {
        data: {
          roomId: parseInt(data.roomId),
          title: data.title,
          description: data.description || undefined,
          startTime: new Date(`${dateBase}T${data.startTime}:00`).toISOString(),
          endTime: new Date(`${dateBase}T${data.endTime}:00`).toISOString(),
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

  // Detail modal handlers
  const handleReservationClick = useCallback(
    (e: React.MouseEvent, res: ReservationWithDetails) => {
      e.stopPropagation();
      setDetailRes(res);
      setDetailOpen(true);
    },
    []
  );

  const handleDetailClose = () => {
    setDetailOpen(false);
    setDetailRes(null);
    setViewMode("detail");
    editForm.reset();
  };

  const handleOpenEdit = () => {
    if (!detailRes) return;
    editForm.reset({
      roomId: String(detailRes.roomId),
      title: detailRes.title,
      startTime: format(new Date(detailRes.startTime), "HH:mm"),
      endTime: format(new Date(detailRes.endTime), "HH:mm"),
      description: detailRes.description ?? "",
    });
    setViewMode("edit");
  };

  const onEditSubmit = (data: EditFormData) => {
    if (!detailRes) return;
    const dateBase = format(new Date(detailRes.startTime), "yyyy-MM-dd");
    updateReservation.mutate(
      {
        id: detailRes.id,
        data: {
          roomId: parseInt(data.roomId),
          title: data.title,
          description: data.description || null,
          startTime: new Date(`${dateBase}T${data.startTime}:00`).toISOString(),
          endTime: new Date(`${dateBase}T${data.endTime}:00`).toISOString(),
        },
      },
      {
        onSuccess: (updated) => {
          queryClient.invalidateQueries({
            queryKey: getListReservationsQueryKey({ date: dateStr }),
          });
          toast({ title: "予約を更新しました", description: updated.title });
          handleDetailClose();
        },
        onError: (err: unknown) => {
          const msg =
            (err as { data?: { error?: string } })?.data?.error ??
            "更新に失敗しました";
          toast({ title: "エラー", description: msg, variant: "destructive" });
        },
      }
    );
  };

  const handleDeleteConfirm = () => {
    if (!detailRes) return;
    deleteReservation.mutate(
      { id: detailRes.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListReservationsQueryKey({ date: dateStr }),
          });
          toast({ title: "予約を削除しました", description: detailRes.title });
          handleDetailClose();
        },
        onError: () => {
          toast({
            title: "エラー",
            description: "削除に失敗しました",
            variant: "destructive",
          });
          setViewMode("detail");
        },
      }
    );
  };

  const selectedRoom = activeRooms.find(
    (r) => r.id === (pendingSelection?.roomId ?? selection?.roomId)
  );

  const detailRoom = activeRooms.find((r) => r.id === detailRes?.roomId);

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
          <div
            className="flex-shrink-0 border-r bg-card"
            style={{ width: TIME_COL_WIDTH }}
          />
          {activeRooms.map((room) => (
            <div
              key={room.id}
              className="flex-1 min-w-[140px] px-3 py-2 border-r last:border-r-0"
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
                      className={`cursor-pointer transition-colors ${
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
                      className="absolute left-0.5 right-0.5 rounded bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 overflow-hidden z-10 cursor-pointer transition-colors"
                      style={{ top: top + 1, height }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => handleReservationClick(e, res)}
                    >
                      <div className="text-xs font-bold leading-tight truncate">
                        {res.title}
                      </div>
                      <div className="text-xs leading-tight truncate opacity-90">
                        {res.user.name}
                      </div>
                      <div className="text-xs leading-tight truncate opacity-80">
                        {startStr} - {endStr}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Booking Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>予約登録</DialogTitle>
            <p className="text-sm text-muted-foreground pt-1">
              {format(selectedDate, "yyyy年M月d日（E）", { locale: ja })}
            </p>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* 会議室 */}
              <FormField
                control={form.control}
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>会議室 <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        {...field}
                      >
                        <option value="">会議室を選択してください</option>
                        {activeRooms.map((r) => (
                          <option key={r.id} value={String(r.id)}>
                            {r.name}（定員{r.capacity}名）
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* タイトル */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>タイトル <span className="text-destructive">*</span></FormLabel>
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

              {/* 開始時刻 / 終了時刻 */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>開始時刻 <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>終了時刻 <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* 説明 */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>説明（任意）</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="会議の内容や備考を入力"
                        rows={2}
                        data-testid="input-description"
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
                    "登録"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ── Reservation Detail / Edit / Confirm-Delete Dialog ── */}
      <Dialog open={detailOpen} onOpenChange={(open) => { if (!open) handleDetailClose(); }}>
        <DialogContent className="sm:max-w-md">

          {/* ── Detail view ── */}
          {viewMode === "detail" && detailRes && (
            <>
              <DialogHeader>
                <DialogTitle>予約詳細</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 py-1">
                <p className="text-xl font-bold text-foreground">{detailRes.title}</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CalendarIcon className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">日付</p>
                      <p className="text-sm font-medium">
                        {format(new Date(detailRes.startTime), "yyyy-MM-dd")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">時間</p>
                      <p className="text-sm font-medium">
                        {format(new Date(detailRes.startTime), "HH:mm")} -{" "}
                        {format(new Date(detailRes.endTime), "HH:mm")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">会議室</p>
                      <p className="text-sm font-medium">
                        {detailRoom
                          ? `${detailRoom.name} (定員${detailRoom.capacity}名)`
                          : `会議室 #${detailRes.roomId}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">予約者</p>
                      <p className="text-sm font-medium">{detailRes.user.name}</p>
                    </div>
                  </div>
                  {detailRes.description && (
                    <div className="flex items-start gap-3">
                      <div className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">備考</p>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {detailRes.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter className="flex-row gap-2 sm:justify-start pt-2">
                  <Button variant="default" className="flex-1" onClick={handleOpenEdit}>
                    <Pencil className="w-4 h-4 mr-1.5" />
                    編集
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setViewMode("confirmDelete")}
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    削除
                  </Button>
                  <Button variant="secondary" className="flex-1" onClick={handleDetailClose}>
                    閉じる
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}

          {/* ── Edit view ── */}
          {viewMode === "edit" && detailRes && (
            <>
              <DialogHeader>
                <DialogTitle>予約編集</DialogTitle>
              </DialogHeader>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 py-1">
                  <FormField
                    control={editForm.control}
                    name="roomId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>会議室</FormLabel>
                        <FormControl>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            {...field}
                          >
                            {activeRooms.map((r) => (
                              <option key={r.id} value={String(r.id)}>
                                {r.name} (定員{r.capacity}名)
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>タイトル</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={editForm.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>開始時刻</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>終了時刻</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={editForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>説明（任意）</FormLabel>
                        <FormControl>
                          <Textarea rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setViewMode("detail")}
                      disabled={updateReservation.isPending}
                    >
                      キャンセル
                    </Button>
                    <Button type="submit" className="flex-1" disabled={updateReservation.isPending}>
                      {updateReservation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : "更新"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </>
          )}

          {/* ── Delete confirmation ── */}
          {viewMode === "confirmDelete" && (
            <>
              <DialogHeader>
                <DialogTitle>予約を削除しますか？</DialogTitle>
              </DialogHeader>
              <div className="py-2 space-y-4">
                <p className="text-sm text-muted-foreground">
                  「<span className="font-medium text-foreground">{detailRes?.title}</span>
                  」を削除します。この操作は元に戻せません。
                </p>
                <DialogFooter className="flex-row gap-2 sm:justify-end pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setViewMode("detail")}
                    disabled={deleteReservation.isPending}
                  >
                    キャンセル
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleDeleteConfirm}
                    disabled={deleteReservation.isPending}
                  >
                    {deleteReservation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : "削除する"}
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}

        </DialogContent>
      </Dialog>
    </div>
  );
}
