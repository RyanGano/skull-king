import Button from "react-bootstrap/esm/Button";
import Modal from "react-bootstrap/esm/Modal";

export interface SimpleModalProps {
  title: string;
  content: JSX.Element;
  defaultButtonContent: string;
  alternateButtonContent?: string;
  onAccept: () => void;
  onCancel: () => void;
  allowAccept?: boolean;
  show: boolean;
  centered?: boolean;
  fullScreen?: boolean;
}

export const SimpleModal = (props: SimpleModalProps) => {
  const {
    title,
    content,
    defaultButtonContent,
    alternateButtonContent,
    onAccept,
    onCancel,
    allowAccept,
    show,
    centered,
    fullScreen,
  } = props;
  return (
    <Modal
      show={show}
      onHide={onCancel}
      centered={centered ?? true}
      fullscreen={fullScreen ?? true ? "sm-down" : ""}
    >
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{content}</Modal.Body>
      <Modal.Footer>
        {alternateButtonContent && (
          <Button variant="secondary" onClick={onCancel}>
            {alternateButtonContent}
          </Button>
        )}
        {(allowAccept ?? true) && (
          <Button variant="primary" onClick={onAccept}>
            {defaultButtonContent}
          </Button>
        )}
        {!(allowAccept ?? true) && (
          <Button variant="primary" disabled>
            {defaultButtonContent}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};
