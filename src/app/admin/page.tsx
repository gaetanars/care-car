import { Suspense } from "react";
import { Button } from "@/components/ui/button";
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
      <form
        action={allow}
        className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
      >
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
      <table className="text-body-sm w-full">
        <caption className="sr-only">Liste blanche</caption>
        <thead>
          <tr className="border-b border-line text-left text-ink-muted">
            <th scope="col" className="py-2 pr-3 font-semibold">
              Utilisateur
            </th>
            <th scope="col" className="py-2 pr-3">
              Rôle et statut
            </th>
            <th scope="col" className="py-2 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr
              key={u.id}
              data-testid={`user-${u.email}`}
              className="border-b border-line align-top"
            >
              <td className="py-2 pr-3">
                <p className="font-medium break-all">{u.email}</p>
                <p className="text-ink-muted">{u.name}</p>
              </td>
              <td className="py-2 pr-3">
                {u.role === "admin" ? "Administrateur" : "Utilisateur"} ·{" "}
                {u.allowed ? "Autorisé" : "Retiré"}
              </td>
              <td className="py-2">
                {u.id !== me.id && (
                  <div className="flex flex-wrap justify-end gap-2">
                    <form action={changeRole}>
                      <input type="hidden" name="userId" value={u.id} />
                      <input
                        type="hidden"
                        name="role"
                        value={u.role === "admin" ? "user" : "admin"}
                      />
                      <Button type="submit" variant="secondary" size="sm">
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<p>Chargement…</p>}>
      <AllowList />
    </Suspense>
  );
}
