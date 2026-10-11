import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdmin } from "@/server/auth/session";
import { listUsers } from "@/server/data/users";
import { allow, changeRole, revoke } from "./actions";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

async function AllowList() {
  const me = await requireAdmin();
  const users = listUsers();
  return (
    <>
      <form action={allow} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Adresse e-mail</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="role">Rôle</Label>
          <select
            id="role"
            name="role"
            defaultValue="user"
            className={selectClass}
          >
            <option value="user">Utilisateur</option>
            <option value="admin">Administrateur</option>
          </select>
        </div>
        <Button type="submit">Ajouter</Button>
      </form>
      <ul className="flex flex-col gap-3">
        {users.map((u) => (
          <li key={u.id}>
            <Card data-testid={`user-${u.email}`}>
              <CardContent className="flex flex-col gap-2">
                <p className="font-medium break-all">{u.email}</p>
                <p className="text-muted-foreground text-sm">{u.name}</p>
                <p className="text-sm">
                  {u.role === "admin" ? "Administrateur" : "Utilisateur"} ·{" "}
                  {u.allowed ? "Autorisé" : "Retiré"}
                </p>
                {u.id !== me.id && (
                  <div className="flex flex-wrap gap-2">
                    <form action={changeRole}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input
                        type="hidden"
                        name="role"
                        value={u.role === "admin" ? "user" : "admin"}
                      />
                      <Button type="submit" variant="outline" size="sm">
                        {u.role === "admin"
                          ? "Passer utilisateur"
                          : "Passer administrateur"}
                      </Button>
                    </form>
                    {u.allowed ? (
                      <form action={revoke}>
                        <input type="hidden" name="userId" value={u.id} />
                        <Button type="submit" variant="destructive" size="sm">
                          Retirer
                        </Button>
                      </form>
                    ) : (
                      <form action={allow}>
                        <input type="hidden" name="email" value={u.email} />
                        <input type="hidden" name="role" value={u.role} />
                        <Button type="submit" size="sm">
                          Réautoriser
                        </Button>
                      </form>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function AdminPage() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Administration</h1>
      <Suspense fallback={<p>Chargement…</p>}>
        <AllowList />
      </Suspense>
    </main>
  );
}
