// @ts-nocheck
import {PhantomReified, PhantomToTypeStr, PhantomTypeArgument, Reified, StructClass, ToField, ToPhantomTypeArgument, ToTypeStr, assertFieldsWithTypesArgsMatch, assertReifiedTypeArgsMatch, decodeFromFields, decodeFromFieldsWithTypes, decodeFromJSONField, extractType, phantom} from "../../../../_framework/reified";
import {FieldsWithTypes, composeIotaType, compressIotaType, parseTypeName} from "../../../../_framework/util";
import {PKG_V5} from "../index";
import {UID} from "../object/structs";
import {bcs} from "@iota/iota-sdk/bcs";
import {IotaClient, IotaObjectData, IotaParsedData} from "@iota/iota-sdk/client";
import {fromB64} from "@iota/iota-sdk/utils";

/* ============================== LabelerCap =============================== */

export function isLabelerCap(type: string): boolean { type = compressIotaType(type); return type.startsWith(`${PKG_V5}::labeler::LabelerCap` + '<'); }

export interface LabelerCapFields<T0 extends PhantomTypeArgument> { id: ToField<UID> }

export type LabelerCapReified<T0 extends PhantomTypeArgument> = Reified< LabelerCap<T0>, LabelerCapFields<T0> >;

export class LabelerCap<T0 extends PhantomTypeArgument> implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::labeler::LabelerCap`; static readonly $numTypeParams = 1; static readonly $isPhantom = [true,] as const;

 readonly $typeName = LabelerCap.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::labeler::LabelerCap<${PhantomToTypeStr<T0>}>`; readonly $typeArgs: [PhantomToTypeStr<T0>]; readonly $isPhantom = LabelerCap.$isPhantom;

 readonly id: ToField<UID>

 private constructor(typeArgs: [PhantomToTypeStr<T0>], fields: LabelerCapFields<T0>, ) { this.$fullTypeName = composeIotaType( LabelerCap.$typeName, ...typeArgs ) as `${typeof PKG_V5}::labeler::LabelerCap<${PhantomToTypeStr<T0>}>`; this.$typeArgs = typeArgs;

 this.id = fields.id; }

 static reified<T0 extends PhantomReified<PhantomTypeArgument>>( T0: T0 ): LabelerCapReified<ToPhantomTypeArgument<T0>> { return { typeName: LabelerCap.$typeName, fullTypeName: composeIotaType( LabelerCap.$typeName, ...[extractType(T0)] ) as `${typeof PKG_V5}::labeler::LabelerCap<${PhantomToTypeStr<ToPhantomTypeArgument<T0>>}>`, typeArgs: [ extractType(T0) ] as [PhantomToTypeStr<ToPhantomTypeArgument<T0>>], isPhantom: LabelerCap.$isPhantom, reifiedTypeArgs: [T0], fromFields: (fields: Record<string, any>) => LabelerCap.fromFields( T0, fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => LabelerCap.fromFieldsWithTypes( T0, item, ), fromBcs: (data: Uint8Array) => LabelerCap.fromBcs( T0, data, ), bcs: LabelerCap.bcs, fromJSONField: (field: any) => LabelerCap.fromJSONField( T0, field, ), fromJSON: (json: Record<string, any>) => LabelerCap.fromJSON( T0, json, ), fromIotaParsedData: (content: IotaParsedData) => LabelerCap.fromIotaParsedData( T0, content, ), fromIotaObjectData: (content: IotaObjectData) => LabelerCap.fromIotaObjectData( T0, content, ), fetch: async (client: IotaClient, id: string) => LabelerCap.fetch( client, T0, id, ), new: ( fields: LabelerCapFields<ToPhantomTypeArgument<T0>>, ) => { return new LabelerCap( [extractType(T0)], fields ) }, kind: "StructClassReified", } }

 static get r() { return LabelerCap.reified }

 static phantom<T0 extends PhantomReified<PhantomTypeArgument>>( T0: T0 ): PhantomReified<ToTypeStr<LabelerCap<ToPhantomTypeArgument<T0>>>> { return phantom(LabelerCap.reified( T0 )); } static get p() { return LabelerCap.phantom }

 static get bcs() { return bcs.struct("LabelerCap", {

 id: UID.bcs

}) };

 static fromFields<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, fields: Record<string, any> ): LabelerCap<ToPhantomTypeArgument<T0>> { return LabelerCap.reified( typeArg, ).new( { id: decodeFromFields(UID.reified(), fields.id) } ) }

 static fromFieldsWithTypes<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, item: FieldsWithTypes ): LabelerCap<ToPhantomTypeArgument<T0>> { if (!isLabelerCap(item.type)) { throw new Error("not a LabelerCap type");

 } assertFieldsWithTypesArgsMatch(item, [typeArg]);

 return LabelerCap.reified( typeArg, ).new( { id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id) } ) }

 static fromBcs<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, data: Uint8Array ): LabelerCap<ToPhantomTypeArgument<T0>> { return LabelerCap.fromFields( typeArg, LabelerCap.bcs.parse(data) ) }

 toJSONField() { return {

 id: this.id,

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, field: any ): LabelerCap<ToPhantomTypeArgument<T0>> { return LabelerCap.reified( typeArg, ).new( { id: decodeFromJSONField(UID.reified(), field.id) } ) }

 static fromJSON<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, json: Record<string, any> ): LabelerCap<ToPhantomTypeArgument<T0>> { if (json.$typeName !== LabelerCap.$typeName) { throw new Error("not a WithTwoGenerics json object") }; assertReifiedTypeArgsMatch( composeIotaType(LabelerCap.$typeName, extractType(typeArg)), json.$typeArgs, [typeArg], )

 return LabelerCap.fromJSONField( typeArg, json, ) }

 static fromIotaParsedData<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, content: IotaParsedData ): LabelerCap<ToPhantomTypeArgument<T0>> { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isLabelerCap(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a LabelerCap object`); } return LabelerCap.fromFieldsWithTypes( typeArg, content ); }

 static fromIotaObjectData<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, data: IotaObjectData ): LabelerCap<ToPhantomTypeArgument<T0>> { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isLabelerCap(data.bcs.type)) { throw new Error(`object at is not a LabelerCap object`); }

 const gotTypeArgs = parseTypeName(data.bcs.type).typeArgs; if (gotTypeArgs.length !== 1) { throw new Error(`type argument mismatch: expected 1 type argument but got '${gotTypeArgs.length}'`); }; const gotTypeArg = compressIotaType(gotTypeArgs[0]); const expectedTypeArg = compressIotaType(extractType(typeArg)); if (gotTypeArg !== compressIotaType(extractType(typeArg))) { throw new Error(`type argument mismatch: expected '${expectedTypeArg}' but got '${gotTypeArg}'`); };

 return LabelerCap.fromBcs( typeArg, fromB64(data.bcs.bcsBytes) ); } if (data.content) { return LabelerCap.fromIotaParsedData( typeArg, data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch<T0 extends PhantomReified<PhantomTypeArgument>>( client: IotaClient, typeArg: T0, id: string ): Promise<LabelerCap<ToPhantomTypeArgument<T0>>> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching LabelerCap object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isLabelerCap(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a LabelerCap object`); }

 return LabelerCap.fromIotaObjectData( typeArg, res.data ); }

 }
