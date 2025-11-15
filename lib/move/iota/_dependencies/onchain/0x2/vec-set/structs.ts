import * as reified from "../../../../_framework/reified";
import {PhantomReified, Reified, StructClass, ToField, ToTypeArgument, ToTypeStr, TypeArgument, assertFieldsWithTypesArgsMatch, assertReifiedTypeArgsMatch, decodeFromFields, decodeFromFieldsWithTypes, decodeFromJSONField, extractType, fieldToJSON, phantom, toBcs} from "../../../../_framework/reified";
import {FieldsWithTypes, composeIotaType, compressIotaType, parseTypeName} from "../../../../_framework/util";
import {Vector} from "../../../../_framework/vector";
import {PKG_V5} from "../index";
import {BcsType, bcs} from "@iota/iota-sdk/bcs";
import {IotaClient, IotaObjectData, IotaParsedData} from "@iota/iota-sdk/client";
import {fromB64} from "@iota/iota-sdk/utils";

/* ============================== VecSet =============================== */

export function isVecSet(type: string): boolean { type = compressIotaType(type); return type.startsWith(`${PKG_V5}::vec_set::VecSet` + '<'); }

export interface VecSetFields<T0 extends TypeArgument> { contents: ToField<Vector<T0>> }

export type VecSetReified<T0 extends TypeArgument> = Reified< VecSet<T0>, VecSetFields<T0> >;

export class VecSet<T0 extends TypeArgument> implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::vec_set::VecSet`; static readonly $numTypeParams = 1; static readonly $isPhantom = [false,] as const;

 readonly $typeName = VecSet.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::vec_set::VecSet<${ToTypeStr<T0>}>`; readonly $typeArgs: [ToTypeStr<T0>]; readonly $isPhantom = VecSet.$isPhantom;

 readonly contents: ToField<Vector<T0>>

 private constructor(typeArgs: [ToTypeStr<T0>], fields: VecSetFields<T0>, ) { this.$fullTypeName = composeIotaType( VecSet.$typeName, ...typeArgs ) as `${typeof PKG_V5}::vec_set::VecSet<${ToTypeStr<T0>}>`; this.$typeArgs = typeArgs;

 this.contents = fields.contents; }

 static reified<T0 extends Reified<TypeArgument, any>>( T0: T0 ): VecSetReified<ToTypeArgument<T0>> { return { typeName: VecSet.$typeName, fullTypeName: composeIotaType( VecSet.$typeName, ...[extractType(T0)] ) as `${typeof PKG_V5}::vec_set::VecSet<${ToTypeStr<ToTypeArgument<T0>>}>`, typeArgs: [ extractType(T0) ] as [ToTypeStr<ToTypeArgument<T0>>], isPhantom: VecSet.$isPhantom, reifiedTypeArgs: [T0], fromFields: (fields: Record<string, any>) => VecSet.fromFields( T0, fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => VecSet.fromFieldsWithTypes( T0, item, ), fromBcs: (data: Uint8Array) => VecSet.fromBcs( T0, data, ), bcs: VecSet.bcs(toBcs(T0)), fromJSONField: (field: any) => VecSet.fromJSONField( T0, field, ), fromJSON: (json: Record<string, any>) => VecSet.fromJSON( T0, json, ), fromIotaParsedData: (content: IotaParsedData) => VecSet.fromIotaParsedData( T0, content, ), fromIotaObjectData: (content: IotaObjectData) => VecSet.fromIotaObjectData( T0, content, ), fetch: async (client: IotaClient, id: string) => VecSet.fetch( client, T0, id, ), new: ( fields: VecSetFields<ToTypeArgument<T0>>, ) => { return new VecSet( [extractType(T0)], fields ) }, kind: "StructClassReified", } }

 static get r() { return VecSet.reified }

 static phantom<T0 extends Reified<TypeArgument, any>>( T0: T0 ): PhantomReified<ToTypeStr<VecSet<ToTypeArgument<T0>>>> { return phantom(VecSet.reified( T0 )); } static get p() { return VecSet.phantom }

 static get bcs() { return <T0 extends BcsType<any>>(T0: T0) => bcs.struct(`VecSet<${T0.name}>`, {

 contents: bcs.vector(T0)

}) };

 static fromFields<T0 extends Reified<TypeArgument, any>>( typeArg: T0, fields: Record<string, any> ): VecSet<ToTypeArgument<T0>> { return VecSet.reified( typeArg, ).new( { contents: decodeFromFields(reified.vector(typeArg), fields.contents) } ) }

 static fromFieldsWithTypes<T0 extends Reified<TypeArgument, any>>( typeArg: T0, item: FieldsWithTypes ): VecSet<ToTypeArgument<T0>> { if (!isVecSet(item.type)) { throw new Error("not a VecSet type");

 } assertFieldsWithTypesArgsMatch(item, [typeArg]);

 return VecSet.reified( typeArg, ).new( { contents: decodeFromFieldsWithTypes(reified.vector(typeArg), item.fields.contents) } ) }

 static fromBcs<T0 extends Reified<TypeArgument, any>>( typeArg: T0, data: Uint8Array ): VecSet<ToTypeArgument<T0>> { const typeArgs = [typeArg];

 return VecSet.fromFields( typeArg, VecSet.bcs( toBcs(typeArgs[0]) ).parse(data) ) }

 toJSONField() { return {

 contents: fieldToJSON<Vector<T0>>(`vector<${this.$typeArgs[0]}>`, this.contents),

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField<T0 extends Reified<TypeArgument, any>>( typeArg: T0, field: any ): VecSet<ToTypeArgument<T0>> { return VecSet.reified( typeArg, ).new( { contents: decodeFromJSONField(reified.vector(typeArg), field.contents) } ) }

 static fromJSON<T0 extends Reified<TypeArgument, any>>( typeArg: T0, json: Record<string, any> ): VecSet<ToTypeArgument<T0>> { if (json.$typeName !== VecSet.$typeName) { throw new Error("not a WithTwoGenerics json object") }; assertReifiedTypeArgsMatch( composeIotaType(VecSet.$typeName, extractType(typeArg)), json.$typeArgs, [typeArg], )

 return VecSet.fromJSONField( typeArg, json, ) }

 static fromIotaParsedData<T0 extends Reified<TypeArgument, any>>( typeArg: T0, content: IotaParsedData ): VecSet<ToTypeArgument<T0>> { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isVecSet(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a VecSet object`); } return VecSet.fromFieldsWithTypes( typeArg, content ); }

 static fromIotaObjectData<T0 extends Reified<TypeArgument, any>>( typeArg: T0, data: IotaObjectData ): VecSet<ToTypeArgument<T0>> { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isVecSet(data.bcs.type)) { throw new Error(`object at is not a VecSet object`); }

 const gotTypeArgs = parseTypeName(data.bcs.type).typeArgs; if (gotTypeArgs.length !== 1) { throw new Error(`type argument mismatch: expected 1 type argument but got '${gotTypeArgs.length}'`); }; const gotTypeArg = compressIotaType(gotTypeArgs[0]); const expectedTypeArg = compressIotaType(extractType(typeArg)); if (gotTypeArg !== compressIotaType(extractType(typeArg))) { throw new Error(`type argument mismatch: expected '${expectedTypeArg}' but got '${gotTypeArg}'`); };

 return VecSet.fromBcs( typeArg, fromB64(data.bcs.bcsBytes) ); } if (data.content) { return VecSet.fromIotaParsedData( typeArg, data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch<T0 extends Reified<TypeArgument, any>>( client: IotaClient, typeArg: T0, id: string ): Promise<VecSet<ToTypeArgument<T0>>> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching VecSet object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isVecSet(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a VecSet object`); }

 return VecSet.fromIotaObjectData( typeArg, res.data ); }

 }
