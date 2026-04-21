import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Users, Phone, Mail, MapPin } from "lucide-react";

export default async function CustomersPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/onboarding");

  const customers = await prisma.customer.findMany({
    where: { userId: user.id },
    include: {
      _count: { select: { jobs: true } },
      jobs: {
        select: { totalAmount: true },
        where: { status: "PAID" },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-4 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <Button asChild>
          <Link href="/customers/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Link>
        </Button>
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-orange-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No customers yet</h3>
          <p className="text-gray-500 mt-2">Add your first customer to get started.</p>
          <Button asChild className="mt-4">
            <Link href="/customers/new"><Plus className="w-4 h-4 mr-2" />Add Customer</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => {
            const totalSpend = customer.jobs.reduce((sum, j) => sum + Number(j.totalAmount ?? 0), 0);
            return (
              <Link key={customer.id} href={`/customers/${customer.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{customer.name}</p>
                        <div className="flex flex-wrap gap-3 mt-1">
                          {customer.phone && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Phone className="w-3 h-3" />{customer.phone}
                            </span>
                          )}
                          {customer.email && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Mail className="w-3 h-3" />{customer.email}
                            </span>
                          )}
                          {customer.suburb && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin className="w-3 h-3" />{customer.suburb} {customer.state}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{customer._count.jobs} job{customer._count.jobs !== 1 ? "s" : ""}</p>
                      </div>
                      {totalSpend > 0 && (
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-gray-700">
                            ${totalSpend.toLocaleString("en-AU")}
                          </p>
                          <p className="text-xs text-gray-400">total spend</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
