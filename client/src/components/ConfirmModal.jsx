import Modal from "./Modal";

export default function ConfirmModal({ isOpen, onClose, onConfirm, label }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmer la suppression">
      <p className="text-base-content/70 mb-6">
        Fafana <span className="font-semibold text-base-content">{label}</span>{" "}
        ? Tsy mety averina intsony raha voafafa.
      </p>
      <div className="flex justify-end gap-2">
        <button className="btn btn-ghost" onClick={onClose}>
          Hiverina
        </button>
        <button className="btn btn-error" onClick={onConfirm}>
          Fafao any
        </button>
      </div>
    </Modal>
  );
}
