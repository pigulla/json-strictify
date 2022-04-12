import * as pointer from 'json-pointer'

import JsonStrictifyError from './json-strictify-error'

export default class CircularReferenceError extends JsonStrictifyError {
    public constructor(references: string[]) {
        super(`Circular reference found at "${pointer.compile(references)}"'`, references)
    }
}
