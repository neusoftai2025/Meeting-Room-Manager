import { useListRooms, getListRoomsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Building2, Users, MapPin, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Rooms() {
  const { data: rooms, isLoading } = useListRooms({
    query: { queryKey: getListRoomsQueryKey() }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">会議室一覧</h1>
        <p className="text-muted-foreground mt-1">設備や定員を確認し、最適な会議室を見つけます。</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="flex flex-col">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rooms && rooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <Card key={room.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{room.name}</CardTitle>
                  <Badge variant={room.isActive ? "default" : "secondary"} className={room.isActive ? "bg-green-600 hover:bg-green-700" : ""}>
                    {room.isActive ? "利用可能" : "メンテナンス中"}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  {room.location}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>定員: <span className="font-medium">{room.capacity}名</span></span>
                </div>
                
                {room.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {room.description}
                  </p>
                )}

                {room.amenities && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">設備:</p>
                    <div className="flex flex-wrap gap-1">
                      {room.amenities.split(',').map((amenity, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-muted/50">
                          {amenity.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-4 border-t border-muted">
                <Link href={`/rooms/${room.id}`} className="w-full">
                  <Button variant="secondary" className="w-full bg-primary/5 hover:bg-primary/10 text-primary">
                    空き状況を見る
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-card border rounded-lg">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <h3 className="text-lg font-medium">会議室がありません</h3>
          <p className="text-muted-foreground mt-2">システムに登録されている会議室がありません。</p>
        </div>
      )}
    </div>
  );
}
