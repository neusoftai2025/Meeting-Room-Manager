import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListUsers,
  getListUsersQueryKey,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useListRooms,
  getListRoomsQueryKey,
  useCreateRoom,
  useUpdateRoom,
  useDeleteRoom,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Pencil,
  Trash2,
  Plus,
  Shield,
  User as UserIcon,
  Building2,
} from "lucide-react";

// ── User schemas (inline form) ───────────────────────────────────────────────
const createUserSchema = z.object({
  name: z.string().min(1, "名前を入力してください"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  password: z.string().min(6, "パスワードは6文字以上で入力してください"),
  isAdmin: z.boolean(),
});
type CreateUserData = z.infer<typeof createUserSchema>;

const editUserSchema = z.object({
  name: z.string().min(1, "名前を入力してください"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  isAdmin: z.boolean(),
});
type EditUserData = z.infer<typeof editUserSchema>;

// ── Room schemas ─────────────────────────────────────────────────────────────
const createRoomSchema = z.object({
  name: z.string().min(1, "会議室名を入力してください"),
  capacity: z.coerce.number().int().min(1, "定員は1以上で入力してください"),
  location: z.string().min(1, "場所を入力してください"),
  description: z.string().optional(),
});
type CreateRoomData = z.infer<typeof createRoomSchema>;

const editRoomSchema = z.object({
  name: z.string().min(1, "会議室名を入力してください"),
  capacity: z.coerce.number().int().min(1, "定員は1以上で入力してください"),
  location: z.string().min(1, "場所を入力してください"),
  description: z.string().optional(),
});
type EditRoomData = z.infer<typeof editRoomSchema>;

// ── Types ────────────────────────────────────────────────────────────────────
type Tab = "users" | "rooms";
type UserFormMode = "none" | "add" | "edit";
type RoomDialogMode = "none" | "add" | "edit" | "delete";

export default function Users() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("users");

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== "admin") setLocation("/dashboard");
  }, [user, setLocation]);

  // ── User inline form state ───────────────────────────────────────────────
  const [userFormMode, setUserFormMode] = useState<UserFormMode>("none");
  const [editingUser, setEditingUser] = useState<{ id: number; name: string; email: string; role: string } | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [deletingUserName, setDeletingUserName] = useState<string>("");
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);

  // ── Room dialog state ────────────────────────────────────────────────────
  const [roomDialogMode, setRoomDialogMode] = useState<RoomDialogMode>("none");
  const [editingRoom, setEditingRoom] = useState<{ id: number; name: string; capacity: number; location: string; description?: string | null } | null>(null);
  const [deletingRoomId, setDeletingRoomId] = useState<number | null>(null);
  const [deletingRoomName, setDeletingRoomName] = useState<string>("");

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: users, isLoading: usersLoading } = useListUsers({
    query: { queryKey: getListUsersQueryKey(), enabled: user?.role === "admin" },
  });
  const { data: rooms, isLoading: roomsLoading } = useListRooms({
    query: { queryKey: getListRoomsQueryKey() },
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();
  const deleteRoom = useDeleteRoom();

  // ── Forms ────────────────────────────────────────────────────────────────
  const createUserForm = useForm<CreateUserData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", email: "", password: "", isAdmin: false },
  });
  const editUserForm = useForm<EditUserData>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { name: "", email: "", isAdmin: false },
  });
  const createRoomForm = useForm<CreateRoomData>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: { name: "", capacity: 10, location: "", description: "" },
  });
  const editRoomForm = useForm<EditRoomData>({
    resolver: zodResolver(editRoomSchema),
    defaultValues: { name: "", capacity: 10, location: "", description: "" },
  });

  if (user?.role !== "admin") return null;

  // ── User handlers ────────────────────────────────────────────────────────
  const openAddUser = () => {
    createUserForm.reset({ name: "", email: "", password: "", isAdmin: false });
    setEditingUser(null);
    setUserFormMode("add");
  };

  const openEditUser = (u: { id: number; name: string; email: string; role: string }) => {
    setEditingUser(u);
    editUserForm.reset({ name: u.name, email: u.email, isAdmin: u.role === "admin" });
    setUserFormMode("edit");
  };

  const cancelUserForm = () => {
    setUserFormMode("none");
    setEditingUser(null);
    createUserForm.reset();
    editUserForm.reset();
  };

  const handleCreateUser = (data: CreateUserData) => {
    createUser.mutate(
      { data: { name: data.name, email: data.email, password: data.password, role: data.isAdmin ? "admin" : "user" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({ title: "ユーザーを追加しました", description: data.name });
          cancelUserForm();
        },
        onError: (err: unknown) => {
          const msg = (err as { data?: { error?: string } })?.data?.error ?? "追加に失敗しました";
          toast({ title: "エラー", description: msg, variant: "destructive" });
        },
      }
    );
  };

  const handleUpdateUser = (data: EditUserData) => {
    if (!editingUser) return;
    updateUser.mutate(
      { id: editingUser.id, data: { name: data.name, email: data.email, role: data.isAdmin ? "admin" : "user" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({ title: "ユーザーを更新しました", description: data.name });
          cancelUserForm();
        },
        onError: (err: unknown) => {
          const msg = (err as { data?: { error?: string } })?.data?.error ?? "更新に失敗しました";
          toast({ title: "エラー", description: msg, variant: "destructive" });
        },
      }
    );
  };

  const openDeleteUser = (id: number, name: string) => {
    setDeletingUserId(id);
    setDeletingUserName(name);
    setShowDeleteUserDialog(true);
  };

  const handleDeleteUser = () => {
    if (!deletingUserId) return;
    deleteUser.mutate(
      { id: deletingUserId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({ title: "ユーザーを削除しました", description: deletingUserName });
          setShowDeleteUserDialog(false);
          setDeletingUserId(null);
        },
        onError: (err: unknown) => {
          const msg = (err as { data?: { error?: string } })?.data?.error ?? "削除に失敗しました";
          toast({ title: "エラー", description: msg, variant: "destructive" });
        },
      }
    );
  };

  // ── Room handlers ────────────────────────────────────────────────────────
  const openAddRoom = () => {
    createRoomForm.reset({ name: "", capacity: 10, location: "", description: "" });
    setRoomDialogMode("add");
  };

  const openEditRoom = (r: { id: number; name: string; capacity: number; location: string; description?: string | null }) => {
    setEditingRoom(r);
    editRoomForm.reset({ name: r.name, capacity: r.capacity, location: r.location, description: r.description ?? "" });
    setRoomDialogMode("edit");
  };

  const openDeleteRoom = (id: number, name: string) => {
    setDeletingRoomId(id);
    setDeletingRoomName(name);
    setRoomDialogMode("delete");
  };

  const handleCreateRoom = (data: CreateRoomData) => {
    createRoom.mutate(
      { data: { name: data.name, capacity: data.capacity, location: data.location, description: data.description || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() });
          toast({ title: "会議室を追加しました", description: data.name });
          setRoomDialogMode("none");
          createRoomForm.reset();
        },
        onError: (err: unknown) => {
          const msg = (err as { data?: { error?: string } })?.data?.error ?? "追加に失敗しました";
          toast({ title: "エラー", description: msg, variant: "destructive" });
        },
      }
    );
  };

  const handleUpdateRoom = (data: EditRoomData) => {
    if (!editingRoom) return;
    updateRoom.mutate(
      { id: editingRoom.id, data: { name: data.name, capacity: data.capacity, location: data.location, description: data.description || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() });
          toast({ title: "会議室を更新しました", description: data.name });
          setRoomDialogMode("none");
          setEditingRoom(null);
        },
        onError: (err: unknown) => {
          const msg = (err as { data?: { error?: string } })?.data?.error ?? "更新に失敗しました";
          toast({ title: "エラー", description: msg, variant: "destructive" });
        },
      }
    );
  };

  const handleDeleteRoom = () => {
    if (!deletingRoomId) return;
    deleteRoom.mutate(
      { id: deletingRoomId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() });
          toast({ title: "会議室を削除しました", description: deletingRoomName });
          setRoomDialogMode("none");
          setDeletingRoomId(null);
        },
        onError: (err: unknown) => {
          const msg = (err as { data?: { error?: string } })?.data?.error ?? "削除に失敗しました";
          toast({ title: "エラー", description: msg, variant: "destructive" });
        },
      }
    );
  };

  // ── Shared inline user form panel ────────────────────────────────────────
  const UserInlineForm = () => {
    const isAdd = userFormMode === "add";
    const form = isAdd ? createUserForm : editUserForm;

    return (
      <div className="bg-card border rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground">
          {isAdd ? "新規ユーザー" : "ユーザー編集"}
        </h3>

        <Form {...(form as typeof createUserForm)}>
          <form
            onSubmit={
              isAdd
                ? createUserForm.handleSubmit(handleCreateUser)
                : editUserForm.handleSubmit(handleUpdateUser)
            }
            className="space-y-4"
          >
            {/* Row 1: 名前 / メールアドレス */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control as typeof createUserForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>名前 <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as typeof createUserForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>メールアドレス <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2: パスワード (add only) / 管理者権限 checkbox */}
            <div className="grid grid-cols-2 gap-4 items-end">
              {isAdd ? (
                <FormField
                  control={createUserForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>パスワード <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <div />
              )}

              <FormField
                control={form.control as typeof createUserForm.control}
                name="isAdmin"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 pb-1">
                    <FormControl>
                      <Checkbox
                        checked={field.value as boolean}
                        onCheckedChange={field.onChange}
                        id="isAdmin"
                      />
                    </FormControl>
                    <FormLabel htmlFor="isAdmin" className="cursor-pointer !mt-0 font-normal">
                      管理者権限
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={createUser.isPending || updateUser.isPending} size="sm">
                {(createUser.isPending || updateUser.isPending) ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isAdd ? "追加中..." : "更新中..."}</>
                ) : (
                  isAdd ? "追加" : "更新"
                )}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={cancelUserForm}>
                キャンセル
              </Button>
            </div>
          </form>
        </Form>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">管理</h1>
        <p className="text-muted-foreground mt-1">ユーザーと会議室の管理を行います。</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => { setTab("users"); cancelUserForm(); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === "users"
              ? "border-primary text-primary bg-primary/5 rounded-t"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserIcon className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          ユーザー管理
        </button>
        <button
          onClick={() => { setTab("rooms"); cancelUserForm(); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            tab === "rooms"
              ? "border-primary text-primary bg-primary/5 rounded-t"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          会議室管理
        </button>
      </div>

      {/* ── USER MANAGEMENT TAB ── */}
      {tab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">ユーザー一覧</h2>
            {userFormMode === "none" && (
              <Button onClick={openAddUser} size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                ユーザー追加
              </Button>
            )}
          </div>

          {/* Inline form (add or edit) */}
          {userFormMode !== "none" && <UserInlineForm />}

          {/* User table */}
          <div className="bg-card rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>メールアドレス</TableHead>
                  <TableHead>権限</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : users && users.length > 0 ? (
                  users.map((u) => (
                    <TableRow key={u.id} className={editingUser?.id === u.id ? "bg-muted/50" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {u.name.charAt(0)}
                          </div>
                          {u.name}
                        </div>
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        {u.role === "admin" ? (
                          <Badge className="bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100">
                            <Shield className="w-3 h-3 mr-1" />
                            管理者
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">一般</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditUser({ id: u.id, name: u.name, email: u.email, role: u.role })}
                            className="p-1.5 rounded hover:bg-muted text-blue-500 hover:text-blue-600 transition-colors"
                            title="編集"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteUser(u.id, u.name)}
                            className="p-1.5 rounded hover:bg-muted text-red-500 hover:text-red-600 transition-colors"
                            title="削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
      )}

      {/* ── ROOM MANAGEMENT TAB ── */}
      {tab === "rooms" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">会議室一覧</h2>
            <Button onClick={openAddRoom} size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              会議室追加
            </Button>
          </div>

          <div className="bg-card rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>会議室名</TableHead>
                  <TableHead>定員</TableHead>
                  <TableHead>場所</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roomsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : rooms && rooms.length > 0 ? (
                  rooms.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          {r.name}
                        </div>
                      </TableCell>
                      <TableCell>{r.capacity}名</TableCell>
                      <TableCell>{r.location}</TableCell>
                      <TableCell>
                        {r.isActive ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                            利用可
                          </Badge>
                        ) : (
                          <Badge variant="secondary">停止中</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditRoom({ id: r.id, name: r.name, capacity: r.capacity, location: r.location, description: r.description })}
                            className="p-1.5 rounded hover:bg-muted text-blue-500 hover:text-blue-600 transition-colors"
                            title="編集"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteRoom(r.id, r.name)}
                            className="p-1.5 rounded hover:bg-muted text-red-500 hover:text-red-600 transition-colors"
                            title="削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      会議室がありません。
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ══ Delete User confirmation dialog ══════════════════════════════════ */}
      <Dialog open={showDeleteUserDialog} onOpenChange={(o) => { if (!o) setShowDeleteUserDialog(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>ユーザーの削除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{deletingUserName}</span> を削除しますか？この操作は取り消せません。
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDeleteUserDialog(false)}>キャンセル</Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={deleteUser.isPending}>
              {deleteUser.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />削除中...</> : "削除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ ROOM DIALOGS ══════════════════════════════════════════════════════ */}

      {/* Add Room */}
      <Dialog open={roomDialogMode === "add"} onOpenChange={(o) => { if (!o) setRoomDialogMode("none"); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>会議室追加</DialogTitle>
          </DialogHeader>
          <Form {...createRoomForm}>
            <form onSubmit={createRoomForm.handleSubmit(handleCreateRoom)} className="space-y-4">
              <FormField control={createRoomForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>会議室名 <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input placeholder="会議室A" autoFocus {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={createRoomForm.control} name="capacity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>定員 <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input type="number" min={1} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={createRoomForm.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>場所 <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input placeholder="3F" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={createRoomForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>説明（任意）</FormLabel>
                  <FormControl><Textarea rows={2} placeholder="設備・備考など" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setRoomDialogMode("none")}>キャンセル</Button>
                <Button type="submit" disabled={createRoom.isPending}>
                  {createRoom.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />追加中...</> : "追加"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Room */}
      <Dialog open={roomDialogMode === "edit"} onOpenChange={(o) => { if (!o) { setRoomDialogMode("none"); setEditingRoom(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>会議室編集</DialogTitle>
          </DialogHeader>
          <Form {...editRoomForm}>
            <form onSubmit={editRoomForm.handleSubmit(handleUpdateRoom)} className="space-y-4">
              <FormField control={editRoomForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>会議室名 <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input autoFocus {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={editRoomForm.control} name="capacity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>定員 <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input type="number" min={1} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={editRoomForm.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>場所 <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={editRoomForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>説明（任意）</FormLabel>
                  <FormControl><Textarea rows={2} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => { setRoomDialogMode("none"); setEditingRoom(null); }}>キャンセル</Button>
                <Button type="submit" disabled={updateRoom.isPending}>
                  {updateRoom.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />更新中...</> : "更新"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Room confirmation */}
      <Dialog open={roomDialogMode === "delete"} onOpenChange={(o) => { if (!o) setRoomDialogMode("none"); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>会議室の削除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{deletingRoomName}</span> を削除しますか？この操作は取り消せません。
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setRoomDialogMode("none")}>キャンセル</Button>
            <Button variant="destructive" onClick={handleDeleteRoom} disabled={deleteRoom.isPending}>
              {deleteRoom.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />削除中...</> : "削除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
