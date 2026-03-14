"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package } from "lucide-react";
import type { Product } from "@/types";

export function ProductSelector() {
  const router = useRouter();
  const params = useParams();
  const productId = params?.productId as string | undefined;
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then(setProducts)
      .catch(console.error);
  }, []);

  return (
    <Select
      value={productId || ""}
      onValueChange={(value) => {
        if (value === "__dashboard__") {
          router.push("/dashboard");
        } else {
          router.push(`/${value}`);
        }
      }}
    >
      <SelectTrigger className="w-[220px] h-9">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Select a product" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__dashboard__">
          <span className="text-muted-foreground">All Products</span>
        </SelectItem>
        {products.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
