"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductCard } from "@/components/dashboard/product-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Plus, Zap } from "lucide-react";
import Image from "next/image";


interface ProductWithCounts {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  leads: [{ count: number }];
  campaigns: [{ count: number }];
}

export default function DashboardPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductWithCounts[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Image src="/vora_logo.png" alt="Vora" width={28} height={28} />
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-lg">Vora</span>
              <span className="text-[0.55rem] text-muted-foreground tracking-wide lowercase">voice across borders</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Products</h1>
            <p className="text-muted-foreground mt-1">
              Select a product to manage its leads and campaigns.
            </p>
          </div>
          <Button onClick={() => router.push("/products/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New Product
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[140px] rounded-xl border bg-muted/30 animate-pulse"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">No products yet</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Create your first product to start managing leads and running
              outreach campaigns.
            </p>
            <Button
              className="mt-4"
              onClick={() => router.push("/products/new")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Product
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                description={product.description}
                leadCount={product.leads?.[0]?.count ?? 0}
                campaignCount={product.campaigns?.[0]?.count ?? 0}
                createdAt={product.created_at}
                onDelete={(deletedId) =>
                  setProducts((prev) => prev.filter((p) => p.id !== deletedId))
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
