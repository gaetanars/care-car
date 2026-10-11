"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { interventionCostCents } from "@/domain/costs";
import { ActionForm } from "../../action-form";
import { InvoiceInput } from "../../invoice-input";
import {
  createInterventionAction,
  updateInterventionAction,
} from "../../intervention-actions";
import { selectClass } from "../../labels";
import { eurosToCents, formatCents } from "../../money";

export interface LineValues {
  partId: string;
  label: string;
  quantity: string;
  amount: string;
}
export interface OpValues {
  operationTypeId: string;
  detail: string;
  lines: LineValues[];
}
export interface InterventionValues {
  date: string;
  displayedKm: string;
  provider: string;
  notes: string;
  labor: string;
  ops: OpValues[];
}

type State = Omit<InterventionValues, "ops"> & {
  ops: (Omit<OpValues, "lines"> & {
    key: number;
    lines: (LineValues & { key: number })[];
  })[];
};

// Stable React keys for rows that have no id yet.
let keySeq = 0;
const nextKey = () => ++keySeq;

const SELF = "Moi-même";
const emptyLine = () => ({
  key: nextKey(),
  partId: "",
  label: "",
  quantity: "1",
  amount: "",
});

/** Intervention entry/edit form (SPEC §7): N operations × N part lines, live total. */
export function InterventionForm({
  vehicleId,
  interventionId,
  initial,
  operationTypes,
  parts,
  providers,
}: {
  vehicleId: number;
  interventionId?: number;
  initial: InterventionValues;
  operationTypes: { id: number; name: string }[];
  parts: { id: number; name: string }[];
  providers: string[];
}) {
  const [values, setValues] = useState<State>(() => ({
    ...initial,
    ops: initial.ops.map((o) => ({
      ...o,
      key: nextKey(),
      lines: o.lines.map((l) => ({ ...l, key: nextKey() })),
    })),
  }));
  const editing = interventionId !== undefined;

  const setOp = (i: number, patch: Partial<State["ops"][number]>) =>
    setValues((v) => ({
      ...v,
      ops: v.ops.map((o, k) => (k === i ? { ...o, ...patch } : o)),
    }));
  const setLine = (i: number, j: number, patch: Partial<LineValues>) =>
    setOp(i, {
      lines: values.ops[i]!.lines.map((l, k) =>
        k === j ? { ...l, ...patch } : l,
      ),
    });
  const addOp = () =>
    setValues((v) => ({
      ...v,
      ops: [
        ...v.ops,
        {
          key: nextKey(),
          operationTypeId: String(operationTypes[0]?.id ?? ""),
          detail: "",
          lines: [],
        },
      ],
    }));
  const removeOp = (i: number) =>
    setValues((v) => ({ ...v, ops: v.ops.filter((_, k) => k !== i) }));
  const addLine = (i: number) =>
    setOp(i, { lines: [...values.ops[i]!.lines, emptyLine()] });
  const removeLine = (i: number, j: number) =>
    setOp(i, { lines: values.ops[i]!.lines.filter((_, k) => k !== j) });

  const total = interventionCostCents({
    date: values.date,
    displayedKm: 0,
    laborCostCents: eurosToCents(values.labor) ?? 0,
    ops: values.ops.map((o) => ({
      operationTypeId: Number(o.operationTypeId),
      partLines: o.lines.map((l) => ({
        amountCents: eurosToCents(l.amount) ?? 0,
      })),
    })),
  });

  const payload = JSON.stringify({
    date: values.date,
    displayedKm: values.displayedKm,
    provider: values.provider,
    notes: values.notes,
    labor: values.labor || "0",
    ops: values.ops.map((o) => ({
      operationTypeId: Number(o.operationTypeId),
      detail: o.detail,
      lines: o.lines.map((l) => ({
        partId: l.partId === "" ? null : Number(l.partId),
        label: l.label,
        quantity: l.quantity,
        amount: l.amount || "0",
      })),
    })),
  });

  return (
    <ActionForm
      action={editing ? updateInterventionAction : createInterventionAction}
      submitLabel={editing ? "Enregistrer" : "Enregistrer l'intervention"}
    >
      <input type="hidden" name="vehicleId" value={vehicleId} />
      {editing && (
        <input type="hidden" name="interventionId" value={interventionId} />
      )}
      <input type="hidden" name="payload" value={payload} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          required
          value={values.date}
          onChange={(e) => setValues({ ...values, date: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="displayedKm">Kilométrage affiché</Label>
        <Input
          id="displayedKm"
          type="number"
          inputMode="numeric"
          min={0}
          required
          value={values.displayedKm}
          onChange={(e) =>
            setValues({ ...values, displayedKm: e.target.value })
          }
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="provider">Prestataire</Label>
        <Input
          id="provider"
          list="providers"
          required
          maxLength={200}
          autoComplete="off"
          value={values.provider}
          onChange={(e) => setValues({ ...values, provider: e.target.value })}
        />
        <datalist id="providers">
          {[...new Set([SELF, ...providers])].map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes (facultatif)</Label>
        <Input
          id="notes"
          maxLength={2000}
          value={values.notes}
          onChange={(e) => setValues({ ...values, notes: e.target.value })}
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Opérations</h2>
        {values.ops.map((op, i) => (
          <Card key={op.key} data-testid={`op-${i}`}>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`op-${i}-type`}>Type d&apos;opération</Label>
                <select
                  id={`op-${i}-type`}
                  className={selectClass}
                  value={op.operationTypeId}
                  onChange={(e) =>
                    setOp(i, { operationTypeId: e.target.value })
                  }
                >
                  {operationTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`op-${i}-detail`}>Détail (facultatif)</Label>
                <Input
                  id={`op-${i}-detail`}
                  maxLength={500}
                  value={op.detail}
                  onChange={(e) => setOp(i, { detail: e.target.value })}
                />
              </div>
              {op.lines.map((line, j) => (
                <fieldset
                  key={line.key}
                  className="flex flex-col gap-2 rounded-md border p-2"
                  data-testid={`op-${i}-line-${j}`}
                >
                  <legend className="px-1 text-sm">Pièce {j + 1}</legend>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`op-${i}-line-${j}-part`}>
                      Pièce de la banque
                    </Label>
                    <select
                      id={`op-${i}-line-${j}-part`}
                      className={selectClass}
                      value={line.partId}
                      onChange={(e) =>
                        setLine(i, j, { partId: e.target.value })
                      }
                    >
                      <option value="">— Libellé libre —</option>
                      {parts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {line.partId === "" && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`op-${i}-line-${j}-label`}>Libellé</Label>
                      <Input
                        id={`op-${i}-line-${j}-label`}
                        required
                        maxLength={200}
                        value={line.label}
                        onChange={(e) =>
                          setLine(i, j, { label: e.target.value })
                        }
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`op-${i}-line-${j}-qty`}>Quantité</Label>
                      <Input
                        id={`op-${i}-line-${j}-qty`}
                        inputMode="decimal"
                        required
                        value={line.quantity}
                        onChange={(e) =>
                          setLine(i, j, { quantity: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`op-${i}-line-${j}-amount`}>
                        Montant TTC (€)
                      </Label>
                      <Input
                        id={`op-${i}-line-${j}-amount`}
                        inputMode="decimal"
                        required
                        pattern="\d+([.,]\d{1,2})?"
                        value={line.amount}
                        onChange={(e) =>
                          setLine(i, j, { amount: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLine(i, j)}
                  >
                    Retirer la pièce {j + 1}
                  </Button>
                </fieldset>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addLine(i)}
              >
                Ajouter une pièce
              </Button>
              {values.ops.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOp(i)}
                >
                  Retirer l&apos;opération
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        <Button type="button" variant="outline" onClick={addOp}>
          Ajouter une opération
        </Button>
      </section>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="labor">Main-d&apos;œuvre TTC (€)</Label>
        <Input
          id="labor"
          inputMode="decimal"
          pattern="\d+([.,]\d{1,2})?"
          placeholder="0,00"
          value={values.labor}
          onChange={(e) => setValues({ ...values, labor: e.target.value })}
        />
      </div>

      {!editing && <InvoiceInput />}

      <p className="text-lg font-semibold" data-testid="live-total">
        Total : {formatCents(total)}
      </p>
    </ActionForm>
  );
}
