import Modal from "./Modal";

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  label,
  deleting = false,
  deleteError = null,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmer la suppression">
      <p className="text-base-content/70 mb-6">
        Fafana <span className="font-semibold text-base-content">{label}</span>{" "}
        ? Tsy mety averina intsony raha voafafa.
      </p>
      {deleteError && (
        <div role="alert" className="alert alert-error py-2 mb-4">
          <span className="text-sm">{deleteError}</span>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button className="btn btn-ghost" onClick={onClose} disabled={deleting}>
          Hiverina
        </button>
        <button
          className="btn btn-error"
          onClick={onConfirm}
          disabled={deleting}
        >
          {deleting && <span className="loading loading-spinner loading-xs" />}
          Fafao any
        </button>
      </div>
    </Modal>
  );
}
