import useSWR from "swr";
import { useState } from "react";
import { Product, AddonGroup, AddonOption } from "@/types/ApiResponse";
const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  return json.data;
};

type ProductModalProps = {
  productSlug: string | null;
  onClose: () => void;
};

export default function ProductModal({
  productSlug,
  onClose,
}: ProductModalProps) {
  type SelectedAddons = Record<number, AddonOption | AddonOption[]>;

  const [selectedAddons, setSelectedAddons] = useState<SelectedAddons>({});
  const { data: product, isLoading } = useSWR<Product>(
    productSlug ? `/products/${productSlug}` : null,
    fetcher,
  );

  const handleSelectAddon = (group: AddonGroup, option: AddonOption) => {
    setSelectedAddons((prev: SelectedAddons) => {
      const groupId = group.id;

      if (group.type === "single") {
        return {
          ...prev,
          [groupId]: option,
        };
      }

      const existing = Array.isArray(prev[groupId]) ? prev[groupId] : [];
      const exists = existing.find((o) => o.id === option.id);

      if (exists) {
        return {
          ...prev,
          [groupId]: existing.filter((o) => o.id !== option.id),
        };
      }

      // respect max_select
      if (group.max_select && existing.length >= group.max_select) {
        return prev;
      }

      return {
        ...prev,
        [groupId]: [...existing, option],
      };
    });
  };

  const calculateTotal = () => {
    let total = product?.price ?? 0;

    Object.values(selectedAddons).forEach((val) => {
      if (Array.isArray(val)) {
        val.forEach((o) => (total += o.price));
      } else if (val) {
        total += val.price;
      }
    });

    return total.toFixed(2);
  };

  if (isLoading || !product) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
        <div className="bg-white p-6 rounded">Loading...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-xl rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">{product.title}</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          <img
            src={product.main_image}
            alt={product.title}
            className="w-full h-48 object-cover rounded"
          />

          <p className="mt-2 text-gray-600">{product.short_description}</p>

          {/* ADDONS */}
          {product.addons?.map((group) => (
            <div key={group.id} className="mt-5">
              <div className="flex justify-between">
                <h4 className="font-semibold">{group.name}</h4>
                {group.is_required && (
                  <span className="text-red-500 text-sm">Required</span>
                )}
              </div>

              <p className="text-xs text-gray-400">
                Select {group.min_select} - {group.max_select}
              </p>

              {group.options.map((option) => {
                const selected = selectedAddons[group.id];

                const isSelected =
                  group.type === "single"
                    ? (selected as AddonOption | undefined)?.id === option.id
                    : Array.isArray(selected) &&
                      selected.some((o) => o.id === option.id);

                return (
                  <div
                    key={option.id}
                    className="flex justify-between items-center mt-2"
                  >
                    <label className="flex items-center gap-2">
                      <input
                        type={group.type === "single" ? "radio" : "checkbox"}
                        checked={isSelected || false}
                        onChange={() => handleSelectAddon(group, option)}
                      />
                      {option.name}
                    </label>

                    <span>+Rs {option.price}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between items-center">
          <span className="font-bold text-lg">Rs {calculateTotal()}</span>

          <button
            className="bg-green-600 text-white px-5 py-2 rounded"
            onClick={() => {
              console.log({
                product_id: product.id,
                addons: selectedAddons,
              });

              onClose();
            }}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
