import * as pointer from 'json-pointer'

import JsonStrictifyError from './json-strictify-error'

export default class InvalidValueError extends JsonStrictifyError {
    public readonly value: unknown

    public constructor(message: string, value: unknown, references: string[]) {
        super(`Invalid value at "${pointer.compile(references)}" (${message}})`, references)

        this.value = value
    }
}
