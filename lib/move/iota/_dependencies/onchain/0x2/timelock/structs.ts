import {PhantomReified, Reified, StructClass, ToField, ToTypeArgument, ToTypeStr, TypeArgument, assertFieldsWithTypesArgsMatch, assertReifiedTypeArgsMatch, decodeFromFields, decodeFromFieldsWithTypes, decodeFromJSONField, extractType, fieldToJSON, phantom, toBcs} from "../../../../_framework/reified";
import {FieldsWithTypes, composeIotaType, compressIotaType, parseTypeName} from "../../../../_framework/util";
import {Option} from "../../0x1/option/structs";
import {String} from "../../0x1/string/structs";
import {PKG_V5} from "../index";
import {UID} from "../object/structs";
import {BcsType, bcs} from "@iota/iota-sdk/bcs";
import {IotaClient, IotaObjectData, IotaParsedData} from "@iota/iota-sdk/client";
import {fromB64} from "@iota/iota-sdk/utils";

/* ============================== TimeLock =============================== */

export function isTimeLock(type: string): boolean { type = compressIotaType(type); return type.startsWith(`${PKG_V5}::timelock::TimeLock` + '<'); }

export interface TimeLockFields<T0 extends TypeArgument> { id: ToField<UID>; locked: ToField<T0>; expirationTimestampMs: ToField<"u64">; label: ToField<Option<String>> }

export type TimeLockReified<T0 extends TypeArgument> = Reified< TimeLock<T0>, TimeLockFields<T0> >;

export class TimeLock<T0 extends TypeArgument> implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::timelock::TimeLock`; static readonly $numTypeParams = 1; static readonly $isPhantom = [false,] as const;

 readonly $typeName = TimeLock.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::timelock::TimeLock<${ToTypeStr<T0>}>`; readonly $typeArgs: [ToTypeStr<T0>]; readonly $isPhantom = TimeLock.$isPhantom;

 readonly id: ToField<UID>; readonly locked: ToField<T0>; readonly expirationTimestampMs: ToField<"u64">; readonly label: ToField<Option<String>>

 private constructor(typeArgs: [ToTypeStr<T0>], fields: TimeLockFields<T0>, ) { this.$fullTypeName = composeIotaType( TimeLock.$typeName, ...typeArgs ) as `${typeof PKG_V5}::timelock::TimeLock<${ToTypeStr<T0>}>`; this.$typeArgs = typeArgs;

 this.id = fields.id;; this.locked = fields.locked;; this.expirationTimestampMs = fields.expirationTimestampMs;; this.label = fields.label; }

 static reified<T0 extends Reified<TypeArgument, any>>( T0: T0 ): TimeLockReified<ToTypeArgument<T0>> { return { typeName: TimeLock.$typeName, fullTypeName: composeIotaType( TimeLock.$typeName, ...[extractType(T0)] ) as `${typeof PKG_V5}::timelock::TimeLock<${ToTypeStr<ToTypeArgument<T0>>}>`, typeArgs: [ extractType(T0) ] as [ToTypeStr<ToTypeArgument<T0>>], isPhantom: TimeLock.$isPhantom, reifiedTypeArgs: [T0], fromFields: (fields: Record<string, any>) => TimeLock.fromFields( T0, fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => TimeLock.fromFieldsWithTypes( T0, item, ), fromBcs: (data: Uint8Array) => TimeLock.fromBcs( T0, data, ), bcs: TimeLock.bcs(toBcs(T0)), fromJSONField: (field: any) => TimeLock.fromJSONField( T0, field, ), fromJSON: (json: Record<string, any>) => TimeLock.fromJSON( T0, json, ), fromIotaParsedData: (content: IotaParsedData) => TimeLock.fromIotaParsedData( T0, content, ), fromIotaObjectData: (content: IotaObjectData) => TimeLock.fromIotaObjectData( T0, content, ), fetch: async (client: IotaClient, id: string) => TimeLock.fetch( client, T0, id, ), new: ( fields: TimeLockFields<ToTypeArgument<T0>>, ) => { return new TimeLock( [extractType(T0)], fields ) }, kind: "StructClassReified", } }

 static get r() { return TimeLock.reified }

 static phantom<T0 extends Reified<TypeArgument, any>>( T0: T0 ): PhantomReified<ToTypeStr<TimeLock<ToTypeArgument<T0>>>> { return phantom(TimeLock.reified( T0 )); } static get p() { return TimeLock.phantom }

 static get bcs() { return <T0 extends BcsType<any>>(T0: T0) => bcs.struct(`TimeLock<${T0.name}>`, {

 id: UID.bcs, locked: T0, expiration_timestamp_ms: bcs.u64(), label: Option.bcs(String.bcs)

}) };

 static fromFields<T0 extends Reified<TypeArgument, any>>( typeArg: T0, fields: Record<string, any> ): TimeLock<ToTypeArgument<T0>> { return TimeLock.reified( typeArg, ).new( { id: decodeFromFields(UID.reified(), fields.id), locked: decodeFromFields(typeArg, fields.locked), expirationTimestampMs: decodeFromFields("u64", fields.expiration_timestamp_ms), label: decodeFromFields(Option.reified(String.reified()), fields.label) } ) }

 static fromFieldsWithTypes<T0 extends Reified<TypeArgument, any>>( typeArg: T0, item: FieldsWithTypes ): TimeLock<ToTypeArgument<T0>> { if (!isTimeLock(item.type)) { throw new Error("not a TimeLock type");

 } assertFieldsWithTypesArgsMatch(item, [typeArg]);

 return TimeLock.reified( typeArg, ).new( { id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id), locked: decodeFromFieldsWithTypes(typeArg, item.fields.locked), expirationTimestampMs: decodeFromFieldsWithTypes("u64", item.fields.expiration_timestamp_ms), label: decodeFromFieldsWithTypes(Option.reified(String.reified()), item.fields.label) } ) }

 static fromBcs<T0 extends Reified<TypeArgument, any>>( typeArg: T0, data: Uint8Array ): TimeLock<ToTypeArgument<T0>> { const typeArgs = [typeArg];

 return TimeLock.fromFields( typeArg, TimeLock.bcs( toBcs(typeArgs[0]) ).parse(data) ) }

 toJSONField() { return {

 id: this.id,locked: fieldToJSON<T0>(this.$typeArgs[0], this.locked),expirationTimestampMs: this.expirationTimestampMs.toString(),label: this.label.toJSONField(),

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField<T0 extends Reified<TypeArgument, any>>( typeArg: T0, field: any ): TimeLock<ToTypeArgument<T0>> { return TimeLock.reified( typeArg, ).new( { id: decodeFromJSONField(UID.reified(), field.id), locked: decodeFromJSONField(typeArg, field.locked), expirationTimestampMs: decodeFromJSONField("u64", field.expirationTimestampMs), label: decodeFromJSONField(Option.reified(String.reified()), field.label) } ) }

 static fromJSON<T0 extends Reified<TypeArgument, any>>( typeArg: T0, json: Record<string, any> ): TimeLock<ToTypeArgument<T0>> { if (json.$typeName !== TimeLock.$typeName) { throw new Error("not a WithTwoGenerics json object") }; assertReifiedTypeArgsMatch( composeIotaType(TimeLock.$typeName, extractType(typeArg)), json.$typeArgs, [typeArg], )

 return TimeLock.fromJSONField( typeArg, json, ) }

 static fromIotaParsedData<T0 extends Reified<TypeArgument, any>>( typeArg: T0, content: IotaParsedData ): TimeLock<ToTypeArgument<T0>> { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isTimeLock(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a TimeLock object`); } return TimeLock.fromFieldsWithTypes( typeArg, content ); }

 static fromIotaObjectData<T0 extends Reified<TypeArgument, any>>( typeArg: T0, data: IotaObjectData ): TimeLock<ToTypeArgument<T0>> { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isTimeLock(data.bcs.type)) { throw new Error(`object at is not a TimeLock object`); }

 const gotTypeArgs = parseTypeName(data.bcs.type).typeArgs; if (gotTypeArgs.length !== 1) { throw new Error(`type argument mismatch: expected 1 type argument but got '${gotTypeArgs.length}'`); }; const gotTypeArg = compressIotaType(gotTypeArgs[0]); const expectedTypeArg = compressIotaType(extractType(typeArg)); if (gotTypeArg !== compressIotaType(extractType(typeArg))) { throw new Error(`type argument mismatch: expected '${expectedTypeArg}' but got '${gotTypeArg}'`); };

 return TimeLock.fromBcs( typeArg, fromB64(data.bcs.bcsBytes) ); } if (data.content) { return TimeLock.fromIotaParsedData( typeArg, data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch<T0 extends Reified<TypeArgument, any>>( client: IotaClient, typeArg: T0, id: string ): Promise<TimeLock<ToTypeArgument<T0>>> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching TimeLock object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isTimeLock(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a TimeLock object`); }

 return TimeLock.fromIotaObjectData( typeArg, res.data ); }

 }
