
import ImprovedAddOrderForm from "./ImprovedAddOrderForm";
import type { Order } from "@/types/orders";

interface AddOrderFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  editingOrder?: Order | null;
}

const AddOrderForm = ({ onSuccess, onCancel, editingOrder }: AddOrderFormProps) => {
  return (
    <ImprovedAddOrderForm
      onSuccess={onSuccess}
      onCancel={onCancel}
      editingOrder={editingOrder}
    />
  );
};

export default AddOrderForm;
