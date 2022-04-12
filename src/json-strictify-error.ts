import * as pointer from 'json-pointer'
import { CustomError } from 'ts-custom-error'

export default abstract class JsonStrictifyError extends CustomError {
    public readonly references: string[]
    public readonly path: string

    public constructor(message: string, references: string[]) {
        super(message)

        this.path = pointer.compile(references)
        this.references = references
    }
}
