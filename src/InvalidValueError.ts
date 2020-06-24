import * as pointer from 'json-pointer'

import JsonStrictifyError from './JsonStrictifyError'

export default class InvalidValueError extends JsonStrictifyError {
    public readonly value: any

    public constructor (message: string, value: any, references: string[]) {
        super(`Invalid value at "${pointer.compile(references)}" (${message}})`, references)

        this.value = value
    }
}
