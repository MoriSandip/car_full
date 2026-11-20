import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TFormControl =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

const isFormControl = (element: Element): element is TFormControl =>
  element instanceof HTMLInputElement ||
  element instanceof HTMLSelectElement ||
  element instanceof HTMLTextAreaElement;

const getFieldContainer = (element: Element, form: HTMLFormElement) => {
  let current: Element | null = element;

  while (current && current !== form) {
    if (current.querySelector("label")) return current;
    current = current.parentElement;
  }

  return null;
};

const getLabel = (element: Element, form: HTMLFormElement) => {
  if (isFormControl(element) && element.labels?.length) {
    return element.labels[0].textContent?.trim() || "";
  }

  const container = getFieldContainer(element, form);
  return container?.querySelector("label")?.textContent?.trim() || "";
};

const getFieldName = (element: Element, form: HTMLFormElement) => {
  const label = getLabel(element, form).replace(/\s*\*\s*/g, " ").trim();
  if (label) return label;

  const control = isFormControl(element) ? element : null;
  return (
    control?.getAttribute("aria-label") ||
    control?.name ||
    control?.id ||
    "This field"
  );
};

const setInvalid = (element: Element, form: HTMLFormElement) => {
  element.setAttribute("aria-invalid", "true");

  if (element instanceof HTMLSelectElement) {
    let parent = element.parentElement;

    while (parent && parent !== form) {
      const trigger = parent.querySelector<HTMLElement>(
        '[role="combobox"]',
      );
      if (trigger) {
        trigger.setAttribute("aria-invalid", "true");
        break;
      }
      parent = parent.parentElement;
    }
  }
};

const getConstraintMessage = (
  control: TFormControl,
  label: string,
  missing: boolean,
) => {
  if (missing || control.validity.valueMissing) {
    return `${label} is required.`;
  }
  if (control.validity.typeMismatch) {
    return `Enter a valid ${label.toLowerCase()}.`;
  }
  if (control.validity.patternMismatch) {
    return `Enter a valid ${label.toLowerCase()}.`;
  }
  if (control.validity.tooShort) {
    return `${label} must contain at least ${control.getAttribute("minlength")} characters.`;
  }
  if (control.validity.tooLong) {
    return `${label} must contain no more than ${control.getAttribute("maxlength")} characters.`;
  }
  if (control.validity.rangeUnderflow) {
    return `${label} must be at least ${control.getAttribute("min")}.`;
  }
  if (control.validity.rangeOverflow) {
    return `${label} must be no more than ${control.getAttribute("max")}.`;
  }
  if (control.validity.stepMismatch || control.validity.badInput) {
    return `Enter a valid value for ${label.toLowerCase()}.`;
  }

  return `${label} is invalid.`;
};

const isPlaceholderSelect = (trigger: HTMLElement) =>
  Boolean(
    trigger.querySelector("[data-placeholder]") ||
      trigger.hasAttribute("data-placeholder"),
  );

const collectFormErrors = (form: HTMLFormElement) => {
  const errors = new Set<string>();

  form.querySelectorAll("input, select, textarea").forEach((element) => {
    if (!isFormControl(element) || element.disabled) return;
    if (element instanceof HTMLInputElement && element.type === "hidden") {
      return;
    }

    const labelText = getLabel(element, form);
    const label = getFieldName(element, form);
    const requiredByLabel = labelText.includes("*");
    const missing =
      requiredByLabel && element.value.trim().length === 0;
    const invalid = !element.validity.valid || missing;

    if (invalid) {
      setInvalid(element, form);
      errors.add(getConstraintMessage(element, label, missing));
    } else {
      element.removeAttribute("aria-invalid");
    }
  });

  form
    .querySelectorAll<HTMLElement>('[role="combobox"]')
    .forEach((trigger) => {
      if (trigger.getAttribute("aria-disabled") === "true") return;

      const labelText = getLabel(trigger, form);
      if (
        !labelText.includes("*") ||
        !isPlaceholderSelect(trigger)
      ) {
        if (!isPlaceholderSelect(trigger)) {
          trigger.removeAttribute("aria-invalid");
        }
        return;
      }

      const label = getFieldName(trigger, form);
      setInvalid(trigger, form);
      errors.add(`${label} is required.`);
    });

  return Array.from(errors);
};

const clearResolvedFields = (form: HTMLFormElement) => {
  form.querySelectorAll("input, select, textarea").forEach((element) => {
    if (!isFormControl(element) || element.disabled) return;

    const labelText = getLabel(element, form);
    const missing =
      labelText.includes("*") && element.value.trim().length === 0;

    if (element.validity.valid && !missing) {
      element.removeAttribute("aria-invalid");
    }
  });

  form
    .querySelectorAll<HTMLElement>(
      '[role="combobox"][aria-invalid="true"]',
    )
    .forEach((trigger) => {
      if (!isPlaceholderSelect(trigger)) {
        trigger.removeAttribute("aria-invalid");
      }
    });
};

const FormValidationMonitor = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const pendingInvalidForms = new Set<HTMLFormElement>();

    const showMessages = (nextMessages: string[]) => {
      if (!nextMessages.length) return;
      setMessages((current) =>
        open ? Array.from(new Set([...current, ...nextMessages])) : nextMessages,
      );
      setOpen(true);
    };

    const showInlineAlerts = (form: HTMLFormElement) => {
      const inlineAlerts = Array.from(
        form.querySelectorAll<HTMLElement>('[role="alert"]'),
      );
      const nextMessages: string[] = [];

      inlineAlerts.forEach((alert) => {
        const message = alert.textContent?.trim();
        if (!message) return;

        if (alert.dataset.validationMessage !== message) {
          alert.dataset.validationMessage = message;
          delete alert.dataset.validationHidden;
        }

        if (alert.dataset.validationHidden === "true") return;

        alert.dataset.validationHidden = "true";
        const fieldContainer = alert.closest<HTMLElement>(".space-y-2");
        const invalidField = fieldContainer?.querySelector<HTMLElement>(
          "input, select, textarea, [role='combobox']",
        );
        if (invalidField) {
          invalidField.setAttribute("aria-invalid", "true");
        }
        nextMessages.push(message);
      });

      showMessages(nextMessages);
    };

    const handleInvalid = (event: Event) => {
      event.preventDefault();
      const target = event.target;
      const form =
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
          ? target.form
          : null;
      if (!form || pendingInvalidForms.has(form)) return;

      pendingInvalidForms.add(form);
      window.setTimeout(() => {
        pendingInvalidForms.delete(form);
        showMessages(collectFormErrors(form));
      }, 0);
    };

    const handleSubmit = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      const formErrors = collectFormErrors(form);
      if (formErrors.length) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showMessages(formErrors);
        return;
      }

      window.setTimeout(() => showInlineAlerts(form), 0);
    };

    const handleChange = (event: Event) => {
      const target = event.target;
      const form =
        target instanceof HTMLElement ? target.closest("form") : null;
      if (!form) return;

      window.requestAnimationFrame(() => clearResolvedFields(form));
    };

    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        const element =
          record.target instanceof Element
            ? record.target
            : record.target.parentElement;
        if (!element) return;

        const alert =
          element.closest<HTMLElement>('[role="alert"]') ||
          Array.from(record.addedNodes).find(
            (node): node is HTMLElement =>
              node instanceof HTMLElement && node.matches('[role="alert"]'),
          );
        const form = alert?.closest<HTMLFormElement>("form");
        if (form) showInlineAlerts(form);

        if (record.attributeName === "data-placeholder") {
          const trigger = element.closest<HTMLElement>(
            '[role="combobox"][aria-invalid="true"]',
          );
          if (trigger && !isPlaceholderSelect(trigger)) {
            trigger.removeAttribute("aria-invalid");
          }
        }
      });
    });

    document.addEventListener("invalid", handleInvalid, true);
    document.addEventListener("submit", handleSubmit, true);
    document.addEventListener("input", handleChange, true);
    document.addEventListener("change", handleChange, true);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-placeholder"],
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => {
      document.removeEventListener("invalid", handleInvalid, true);
      document.removeEventListener("submit", handleSubmit, true);
      document.removeEventListener("input", handleChange, true);
      document.removeEventListener("change", handleChange, true);
      observer.disconnect();
    };
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setMessages([]);
      }}
    >
      <DialogContent className="form-validation-alert">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Please review the form
          </DialogTitle>
          <DialogDescription>
            Fix the highlighted fields before submitting.
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-[50vh] list-disc space-y-2 overflow-y-auto pl-5 text-sm text-slate-700">
          {messages.map((message, index) => (
            <li key={`${message}-${index}`}>{message}</li>
          ))}
        </ul>

        <DialogFooter>
          <Button type="button" onClick={() => setOpen(false)}>
            Review fields
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FormValidationMonitor;
