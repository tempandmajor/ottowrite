/**
 * Operational Transform (OT) Engine
 * Enables conflict-free collaborative text editing
 *
 * Based on the OT algorithm for real-time synchronization:
 * - Operations: insert, delete, retain
 * - Transform function: handles concurrent operations
 * - Composition: combines sequential operations
 */

export type Operation =
  | { type: 'retain'; count: number }
  | { type: 'insert'; text: string }
  | { type: 'delete'; count: number }

export type TextOperation = {
  ops: Operation[]
  baseLength: number
  targetLength: number
}

/**
 * Apply an operation to a document
 */
export function applyOperation(doc: string, operation: TextOperation): string {
  if (doc.length !== operation.baseLength) {
    throw new Error(`Base length mismatch: expected ${operation.baseLength}, got ${doc.length}`)
  }

  let result = ''
  let docIndex = 0

  for (const op of operation.ops) {
    switch (op.type) {
      case 'retain':
        if (docIndex + op.count > doc.length) {
          throw new Error('Retain operation exceeds document length')
        }
        result += doc.slice(docIndex, docIndex + op.count)
        docIndex += op.count
        break

      case 'insert':
        result += op.text
        break

      case 'delete':
        if (docIndex + op.count > doc.length) {
          throw new Error('Delete operation exceeds document length')
        }
        docIndex += op.count
        break
    }
  }

  if (docIndex !== doc.length) {
    throw new Error('Operation did not consume entire document')
  }

  if (result.length !== operation.targetLength) {
    throw new Error(`Target length mismatch: expected ${operation.targetLength}, got ${result.length}`)
  }

  return result
}

/**
 * Create an operation that inserts text at a position
 */
export function insertOp(position: number, text: string, docLength: number): TextOperation {
  const ops: Operation[] = []

  if (position > 0) {
    ops.push({ type: 'retain', count: position })
  }

  ops.push({ type: 'insert', text })

  if (position < docLength) {
    ops.push({ type: 'retain', count: docLength - position })
  }

  return {
    ops,
    baseLength: docLength,
    targetLength: docLength + text.length,
  }
}

/**
 * Create an operation that deletes text at a position
 */
export function deleteOp(position: number, count: number, docLength: number): TextOperation {
  const ops: Operation[] = []

  if (position > 0) {
    ops.push({ type: 'retain', count: position })
  }

  ops.push({ type: 'delete', count })

  if (position + count < docLength) {
    ops.push({ type: 'retain', count: docLength - position - count })
  }

  return {
    ops,
    baseLength: docLength,
    targetLength: docLength - count,
  }
}

/**
 * Transform two concurrent operations
 *
 * Given two operations A and B that happened concurrently on the same document state,
 * transform them so that applying A' after B has the same effect as applying A and B' has the same effect as B
 */
export function transform(op1: TextOperation, op2: TextOperation, _side: 'left' | 'right'): TextOperation {
  if (op1.baseLength !== op2.baseLength) {
    throw new Error('Both operations must have the same base length')
  }

  const ops1 = [...op1.ops]
  const ops2 = [...op2.ops]
  const result: Operation[] = []

  let i = 0
  let j = 0

  while (i < ops1.length || j < ops2.length) {
    // Get next operation from each list
    const o1 = i < ops1.length ? ops1[i] : null
    const o2 = j < ops2.length ? ops2[j] : null

    if (!o1 && !o2) break

    // Handle insert operations
    if (o1?.type === 'insert') {
      result.push({ type: 'retain', count: o1.text.length })
      i++
      continue
    }

    if (o2?.type === 'insert') {
      result.push({ type: 'insert', text: o2.text })
      j++
      continue
    }

    if (!o1 || !o2) {
      throw new Error('Unexpected end of operations')
    }

    // Handle retain/delete operations
    if (o1.type === 'retain' && o2.type === 'retain') {
      const minCount = Math.min(o1.count, o2.count)
      result.push({ type: 'retain', count: minCount })

      if (o1.count > minCount) {
        ops1[i] = { type: 'retain', count: o1.count - minCount }
      } else {
        i++
      }

      if (o2.count > minCount) {
        ops2[j] = { type: 'retain', count: o2.count - minCount }
      } else {
        j++
      }
    } else if (o1.type === 'delete' && o2.type === 'delete') {
      const minCount = Math.min(o1.count, o2.count)

      if (o1.count > minCount) {
        ops1[i] = { type: 'delete', count: o1.count - minCount }
      } else {
        i++
      }

      if (o2.count > minCount) {
        ops2[j] = { type: 'delete', count: o2.count - minCount }
      } else {
        j++
      }
    } else if (o1.type === 'delete' && o2.type === 'retain') {
      const minCount = Math.min(o1.count, o2.count)
      result.push({ type: 'delete', count: minCount })

      if (o1.count > minCount) {
        ops1[i] = { type: 'delete', count: o1.count - minCount }
      } else {
        i++
      }

      if (o2.count > minCount) {
        ops2[j] = { type: 'retain', count: o2.count - minCount }
      } else {
        j++
      }
    } else if (o1.type === 'retain' && o2.type === 'delete') {
      const minCount = Math.min(o1.count, o2.count)

      if (o1.count > minCount) {
        ops1[i] = { type: 'retain', count: o1.count - minCount }
      } else {
        i++
      }

      if (o2.count > minCount) {
        ops2[j] = { type: 'delete', count: o2.count - minCount }
      } else {
        j++
      }
    }
  }

  return {
    ops: normalizeOps(result),
    baseLength: op2.targetLength,
    targetLength: op1.targetLength + (op2.targetLength - op2.baseLength),
  }
}

/**
 * Compose two sequential operations into one
 * Operation A followed by operation B = operation AB
 */
export function compose(op1: TextOperation, op2: TextOperation): TextOperation {
  if (op1.targetLength !== op2.baseLength) {
    throw new Error('Operations cannot be composed: target length of first does not match base length of second')
  }

  const ops1 = [...op1.ops]
  const ops2 = [...op2.ops]
  const result: Operation[] = []

  let i = 0
  let j = 0

  while (i < ops1.length || j < ops2.length) {
    const o1 = i < ops1.length ? ops1[i] : null
    const o2 = j < ops2.length ? ops2[j] : null

    if (!o1 && !o2) break

    // Delete from second operation
    if (o2?.type === 'delete') {
      result.push(o2)
      j++
      continue
    }

    // Insert from first operation
    if (o1?.type === 'insert') {
      result.push(o1)
      i++
      continue
    }

    if (!o1 || !o2) {
      throw new Error('Unexpected end of operations')
    }

    // Both retain
    if (o1.type === 'retain' && o2.type === 'retain') {
      const minCount = Math.min(o1.count, o2.count)
      result.push({ type: 'retain', count: minCount })

      if (o1.count > minCount) {
        ops1[i] = { type: 'retain', count: o1.count - minCount }
      } else {
        i++
      }

      if (o2.count > minCount) {
        ops2[j] = { type: 'retain', count: o2.count - minCount }
      } else {
        j++
      }
    }
    // Delete then retain
    else if (o1.type === 'delete' && o2.type === 'retain') {
      result.push({ type: 'delete', count: o1.count })

      if (o2.count > o1.count) {
        ops2[j] = { type: 'retain', count: o2.count - o1.count }
      } else {
        j++
      }
      i++
    }
    // Retain then insert
    else if (o1.type === 'retain' && o2.type === 'insert') {
      result.push({ type: 'insert', text: o2.text })
      j++
    }
    // Delete then insert (delete wins)
    else if (o1.type === 'delete' && o2.type === 'insert') {
      result.push({ type: 'insert', text: o2.text })
      j++
    }
  }

  return {
    ops: normalizeOps(result),
    baseLength: op1.baseLength,
    targetLength: op2.targetLength,
  }
}

/**
 * Normalize operations by merging consecutive operations of the same type
 */
function normalizeOps(ops: Operation[]): Operation[] {
  const result: Operation[] = []

  for (const op of ops) {
    const last = result[result.length - 1]

    if (!last) {
      result.push(op)
      continue
    }

    // Merge consecutive retains
    if (op.type === 'retain' && last.type === 'retain') {
      result[result.length - 1] = { type: 'retain', count: last.count + op.count }
    }
    // Merge consecutive deletes
    else if (op.type === 'delete' && last.type === 'delete') {
      result[result.length - 1] = { type: 'delete', count: last.count + op.count }
    }
    // Merge consecutive inserts
    else if (op.type === 'insert' && last.type === 'insert') {
      result[result.length - 1] = { type: 'insert', text: last.text + op.text }
    }
    // Otherwise add as new operation
    else {
      result.push(op)
    }
  }

  return result
}

/**
 * Invert an operation (for undo functionality)
 */
export function invert(operation: TextOperation, doc: string): TextOperation {
  if (doc.length !== operation.baseLength) {
    throw new Error('Document length does not match operation base length')
  }

  const result: Operation[] = []
  let docIndex = 0

  for (const op of operation.ops) {
    switch (op.type) {
      case 'retain':
        result.push({ type: 'retain', count: op.count })
        docIndex += op.count
        break

      case 'insert':
        result.push({ type: 'delete', count: op.text.length })
        break

      case 'delete':
        result.push({ type: 'insert', text: doc.slice(docIndex, docIndex + op.count) })
        docIndex += op.count
        break
    }
  }

  return {
    ops: normalizeOps(result),
    baseLength: operation.targetLength,
    targetLength: operation.baseLength,
  }
}

/**
 * Check if an operation is a no-op (does nothing)
 */
export function isNoop(operation: TextOperation): boolean {
  return operation.baseLength === operation.targetLength &&
         operation.ops.every(op => op.type === 'retain')
}

/**
 * Serialize operation to JSON
 */
export function serializeOperation(operation: TextOperation): string {
  return JSON.stringify(operation)
}

/**
 * Deserialize operation from JSON
 */
export function deserializeOperation(json: string): TextOperation {
  return JSON.parse(json) as TextOperation
}
