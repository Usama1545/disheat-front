import { FC, useState, useEffect } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Image,
  Chip,
  addToast,
} from "@heroui/react";
import { ShoppingCart, X, Minus, Plus } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux/store";
import {
  handleAddToCart,
  handleOfflineAddToCart,
} from "@/helpers/functionalHelpers";
import { Product } from "@/types/ApiResponse";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  initialProduct?: Product;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const json = await res.json();
  return json.data;
};

interface AddonOption {
  id: string | number;
  name: string;
  price: string | number;
}

interface AddonGroup {
  id: string | number;
  name: string;
  type: "single" | "multiple";
  is_required?: boolean;
  min_select: number;
  max_select: number | null;
  options: AddonOption[];
}

const ProductModal: FC<ProductModalProps> = ({
  isOpen,
  onClose,
  product,
  initialProduct,
}) => {
  const { currencySymbol } = useSettings();
  const { t } = useTranslation();
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const cartData = useSelector((state: RootState) => state.cart.cartData);

  const [selectedAddons, setSelectedAddons] = useState<Record<string, any>>({});
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  // Reset state when modal opens/closes or product changes
  useEffect(() => {
    if (isOpen && product) {
      setQuantity(product.minimum_order_quantity || 1);
      setSelectedAddons({});
    }
  }, [isOpen, product]);

  // Prefill quantity from cart if exists
  useEffect(() => {
    if (product && cartData?.items && isOpen) {
      const cartItem = cartData.items.find(
        (item) => item.product_id === product.id,
      );
      if (cartItem) {
        setQuantity(cartItem.quantity);
      }
    }
  }, [product, cartData, isOpen]);

  const handleSelectAddon = (group: AddonGroup, option: AddonOption) => {
    setSelectedAddons((prev) => {
      const groupId = group.id;

      if (group.type === "single") {
        return {
          ...prev,
          [groupId]: option,
        };
      }

      const existing: AddonOption[] = prev[groupId] || [];
      const exists = existing.find((o) => o.id === option.id);

      if (exists) {
        return {
          ...prev,
          [groupId]: existing.filter((o) => o.id !== option.id),
        };
      }

      // respect max_select
      if (group.max_select && existing.length >= group.max_select) {
        addToast({
          title: t("addon.max_selection_title"),
          description: t("addon.max_selection_description", {
            max: group.max_select,
          }),
          color: "warning",
        });
        return prev;
      }

      return {
        ...prev,
        [groupId]: [...existing, option],
      };
    });
  };

  const calculateSubtotal = () => {
    if (!product) return 0;

    let total = Number(product.price ?? 0);

    Object.values(selectedAddons).forEach((val) => {
      if (Array.isArray(val)) {
        val.forEach((o) => {
          total += Number(o.price);
        });
      } else if (val) {
        total += Number(val.price);
      }
    });

    return Number(total.toFixed(2));
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal * quantity;
  };

  const validateAddons = (): boolean => {
    if (!product?.addons) return true;

    for (const group of product.addons) {
      const selected = selectedAddons[group.id];

      if (group.is_required) {
        if (group.type === "single" && !selected) {
          addToast({
            title: t("addon.required_title"),
            description: t("addon.required_description", { name: group.name }),
            color: "danger",
          });
          return false;
        }

        if (group.type === "multiple" && (!selected || selected.length === 0)) {
          addToast({
            title: t("addon.required_title"),
            description: t("addon.required_description", { name: group.name }),
            color: "danger",
          });
          return false;
        }
      }

      const minSelect = group.min_select ?? 0;

      if (group.type === "multiple" && selected && minSelect > 0) {
        if (selected.length < minSelect) {
          addToast({
            title: t("addon.min_selection_title"),
            description: t("addon.min_selection_description", {
              name: group.name,
              min: group.min_select,
            }),
            color: "danger",
          });
          return false;
        }
      }
    }

    return true;
  };

  const handleAddToCartAction = async () => {
    if (!product) return;

    if (!validateAddons()) return;

    const minQuantity = product.minimum_order_quantity || 1;
    if (quantity < minQuantity) {
      addToast({
        title: t("min_quantity_error_title"),
        description: t("min_quantity_error_description", { min: minQuantity }),
        color: "danger",
      });
      return;
    }

    setLoading(true);
    try {
      // Format addons for cart
      const addonsData = Object.entries(selectedAddons).flatMap(
        ([groupId, value]) => {
          if (Array.isArray(value)) {
            return value.map((option) => ({
              addon_group_id: groupId,
              id: option.id,
              price: option.price,
              name: option.name,
            }));
          } else if (value) {
            return [
              {
                addon_group_id: groupId,
                id: value.id,
                price: value.price,
                name: value.name,
              },
            ];
          }
          return [];
        },
      );

      if (isLoggedIn) {
        await handleAddToCart({
          product_id: product.id,
          store_id: product.store_id,
          quantity: quantity,
          addons: addonsData,
          onClose: onClose,
          renderToast: true,
        });
      } else {
        handleOfflineAddToCart({
          product,
          quantity,
          addons: addonsData,
          onClose,
        });
      }
    } catch (error) {
      console.error("Add to cart failed:", error);
      addToast({
        title: t("error"),
        description: t("add_to_cart_error"),
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityDecrease = () => {
    const minQuantity = product?.minimum_order_quantity || 1;
    if (quantity <= minQuantity) {
      addToast({
        title: t("min_quantity_error_title"),
        description: t("min_quantity_error_description", { min: minQuantity }),
        color: "danger",
      });
      return;
    }
    setQuantity((prev) => Math.max(prev - 1, minQuantity));
  };

  const handleQuantityIncrease = () => {
    const maxQuantity = product?.total_allowed_quantity || 9999;
    if (quantity >= maxQuantity) {
      addToast({
        title: t("max_quantity_error_title"),
        description: t("max_quantity_error_description", { max: maxQuantity }),
        color: "danger",
      });
      return;
    }
    setQuantity((prev) => Math.min(prev + 1, maxQuantity));
  };

  if (!isOpen) return null;

  const totalPrice = calculateTotal();
  const subtotal = calculateSubtotal();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      backdrop="blur"
      classNames={{
        backdrop: "bg-black/60 backdrop-blur-sm",
      }}
      placement="bottom-center"
    >
      <ModalContent className="max-w-md mx-auto">
        <ModalHeader className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {product?.title || t("product_modal.add_to_cart_title")}
          </h2>
          <Button
            isIconOnly
            variant="light"
            size="sm"
            onPress={onClose}
            className="absolute right-2 top-2"
          >
            <X size={18} />
          </Button>
        </ModalHeader>

        <ModalBody className="space-y-4">
          {!product ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Product Image and Basic Info */}
              <div className="grid grid-cols-[35%_65%] gap-4">
                <div className="flex items-center flex-col bg-gray-100 dark:bg-default-100 rounded-lg">
                  {product.main_image ? (
                    <Image
                      src={product.main_image}
                      alt={product.title || t("product_modal.untitled")}
                      classNames={{
                        wrapper: "w-full h-32 p-0.5 flex justify-center",
                        img: "w-full h-full object-contain",
                      }}
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-300 rounded-md" />
                  )}
                </div>
                <div className="flex items-start flex-col">
                  <h3 className="text-lg font-bold leading-tight">
                    {product.title || t("product_modal.untitled")}
                  </h3>
                  {product.short_description && (
                    <p
                      className="text-xs text-foreground/50 leading-relaxed mt-1"
                      title={product.short_description}
                    >
                      {product.short_description}
                    </p>
                  )}
                  {product.brand_name && (
                    <span className="text-primary text-xs font-semibold mt-1">
                      {product.brand_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Price Display */}
              <div className="bg-linear-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {currencySymbol}
                      {subtotal.toFixed(2)}
                    </div>
                    {product.compare_at_price &&
                      product.compare_at_price > product.price && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-foreground/50 line-through">
                            {currencySymbol}
                            {Number(product.compare_at_price).toFixed(2)}
                          </span>
                          <span className="text-xs text-green-600 font-medium">
                            {t("product_modal.save", {
                              amount: `${currencySymbol} ${(Number(product.compare_at_price) - Number(product.price)).toFixed(2)}`,
                            })}
                          </span>
                        </div>
                      )}
                  </div>

                  {/* Quantity Selector */}
                  <div className="flex items-center gap-1">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="flat"
                      isDisabled={loading}
                      onPress={handleQuantityDecrease}
                      className="w-8 h-8 min-w-8"
                    >
                      <Minus size={14} />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">
                      {quantity}
                    </span>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="flat"
                      isDisabled={loading}
                      onPress={handleQuantityIncrease}
                      className="w-8 h-8 min-w-8"
                    >
                      <Plus size={14} />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Addons Section */}
              {product.addons && product.addons.length > 0 && (
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  <h3 className="text-sm font-semibold">
                    {t("addon.customize_order")}
                  </h3>
                  {product.addons.map((group) => (
                    <div key={group.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-sm">{group.name}</h4>
                        {group.is_required && (
                          <Chip
                            size="sm"
                            color="danger"
                            variant="flat"
                            className="text-xxs"
                          >
                            {t("addon.required")}
                          </Chip>
                        )}
                      </div>

                      {group.min_select > 0 && (
                        <p className="text-xs text-foreground/50">
                          {t("addon.select_range", {
                            min: group.min_select,
                            max: group.max_select || t("addon.unlimited"),
                          })}
                        </p>
                      )}

                      <div className="space-y-2">
                        {group.options.map((option) => {
                          const selected = selectedAddons[group.id];
                          const isSelected =
                            group.type === "single"
                              ? selected?.id === option.id
                              : selected?.some(
                                  (o: AddonOption) => o.id === option.id,
                                );

                          return (
                            <div
                              key={option.id}
                              className="flex justify-between items-center p-2 hover:bg-default-100 rounded-lg transition-colors"
                            >
                              <label className="flex items-center gap-2 flex-1 cursor-pointer">
                                <input
                                  type={
                                    group.type === "single"
                                      ? "radio"
                                      : "checkbox"
                                  }
                                  name={`addon-group-${group.id}`}
                                  checked={isSelected || false}
                                  onChange={() =>
                                    handleSelectAddon(group, option)
                                  }
                                  className="w-4 h-4"
                                />
                                <span className="text-sm">{option.name}</span>
                              </label>
                              <span className="text-sm font-medium">
                                +{currencySymbol}
                                {parseFloat(String(option.price)).toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Total Price Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-foreground">
                    {t("product_modal.total", { count: quantity })}
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {currencySymbol}
                    {totalPrice.toFixed(2)}
                  </span>
                </div>
                {quantity > 1 && subtotal !== totalPrice / quantity && (
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-foreground/50">
                      {t("product_modal.per_item")}
                    </span>
                    <span className="text-xs text-foreground/50">
                      {currencySymbol}
                      {subtotal.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </ModalBody>

        <ModalFooter>
          <div className="flex gap-2 w-full">
            <Button
              variant="bordered"
              onPress={onClose}
              className="flex-1 text-sm"
              size="sm"
              isDisabled={loading}
            >
              {t("product_modal.cancel")}
            </Button>
            <Button
              color="primary"
              onPress={handleAddToCartAction}
              isDisabled={!product}
              className="flex-1 text-sm"
              size="sm"
              startContent={<ShoppingCart size={16} />}
              isLoading={loading}
            >
              {t("add_to_cart")} - {currencySymbol}
              {totalPrice.toFixed(2)}
            </Button>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ProductModal;
