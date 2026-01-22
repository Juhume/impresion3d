import AdminWrapper from './AdminWrapper';
import ProductForm from './ProductForm';

interface Props {
  productId?: string;
}

export default function AdminProductForm({ productId }: Props) {
  return (
    <AdminWrapper>
      <ProductForm productId={productId} />
    </AdminWrapper>
  );
}
