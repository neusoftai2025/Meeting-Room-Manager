import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useListRooms, useCreateReservation, getListRoomsQueryKey, getListReservationsQueryKey } from "@workspace/api-client-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const createReservationSchema = z.object({
  roomId: z.coerce.number().min(1, { message: "会議室を選択してください" }),
  title: z.string().min(1, { message: "タイトルを入力してください" }),
  description: z.string().optional(),
  date: z.string().min(1, { message: "日付を選択してください" }),
  startTime: z.string().min(1, { message: "開始時間を選択してください" }),
  endTime: z.string().min(1, { message: "終了時間を選択してください" }),
  attendees: z.coerce.number().min(1, { message: "1名以上で入力してください" }).optional(),
}).refine((data) => {
  if (data.startTime && data.endTime) {
    return data.startTime < data.endTime;
  }
  return true;
}, {
  message: "終了時間は開始時間より後に設定してください",
  path: ["endTime"],
});

type FormValues = z.infer<typeof createReservationSchema>;

export default function NewReservation() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rooms } = useListRooms({
    query: { queryKey: getListRoomsQueryKey() }
  });

  const createMutation = useCreateReservation();

  const form = useForm<FormValues>({
    resolver: zodResolver(createReservationSchema),
    defaultValues: {
      title: "",
      description: "",
      date: new Date().toISOString().split('T')[0],
      startTime: "10:00",
      endTime: "11:00",
    },
  });

  const onSubmit = (data: FormValues) => {
    // Combine date and time
    const startDateTime = new Date(`${data.date}T${data.startTime}:00`).toISOString();
    const endDateTime = new Date(`${data.date}T${data.endTime}:00`).toISOString();

    createMutation.mutate(
      {
        data: {
          roomId: data.roomId,
          title: data.title,
          description: data.description || null,
          startTime: startDateTime,
          endTime: endDateTime,
          attendees: data.attendees || null,
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReservationsQueryKey() });
          toast({
            title: "予約完了",
            description: "会議室の予約が完了しました。",
          });
          setLocation("/reservations");
        },
        onError: (error: any) => {
          toast({
            variant: "destructive",
            title: "予約エラー",
            description: error?.response?.data?.error || "予約に失敗しました。他の予約と重複している可能性があります。",
          });
        }
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/reservations")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">新規予約</h1>
          <p className="text-muted-foreground mt-1">会議室の新しい予約を作成します。</p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <FormField
              control={form.control}
              name="roomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>会議室</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="会議室を選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {rooms?.map((room) => (
                        <SelectItem key={room.id} value={room.id.toString()}>
                          {room.name} (定員: {room.capacity}名)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>目的・タイトル</FormLabel>
                  <FormControl>
                    <Input placeholder="例: 定例ミーティング" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>日付</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>開始時間</FormLabel>
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
                    <FormLabel>終了時間</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="attendees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>参加予定人数</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" placeholder="例: 4" {...field} value={field.value || ""} />
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
                  <FormLabel>備考 (任意)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="必要な機材やアジェンダなど" 
                      className="resize-none h-24"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setLocation("/reservations")}>
                キャンセル
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                予約を確定する
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
