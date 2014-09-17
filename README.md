# json-strictify

Check if a value can safely be JSON.stringify'd, i.e. if it doesn't contain values that would be dropped during serialization (such as functions, `undefined` or `NaN`).

#### Known limitations

json-strictify is intended to be used with POJSO, meaning objects that are created with either the object literal syntax (`{}`) or with `Object.create(null)`. It will reject any object that does not have `Object` as its prototype (or none at all). This means that some values will fail validation even if they are completely safe to stringify. Also, any `toJSON` methods are ignored.
