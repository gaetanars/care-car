import { AdminTabs } from "./admin-tabs";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold">Administration</h1>
      <AdminTabs />
      {children}
    </main>
  );
}
