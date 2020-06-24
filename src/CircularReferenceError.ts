import * as pointer from 'json-pointer'

import JsonStrictifyError from './JsonStrictifyError'

export default class CircularReferenceError extends JsonStrictifyError {
    public constructor (references: string[]) {
        super(`Circular reference found at "${pointer.compile(references)}"'`, references)
    }
}
