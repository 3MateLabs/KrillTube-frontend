// @ts-nocheck
import {PhantomReified, Reified, StructClass, ToField, ToTypeArgument, ToTypeStr, TypeArgument, assertFieldsWithTypesArgsMatch, assertReifiedTypeArgsMatch, decodeFromFields, decodeFromFieldsWithTypes, decodeFromJSONField, extractType, phantom, toBcs} from "../../../../_framework/reified";
import {FieldsWithTypes, composeIotaType, compressIotaType, parseTypeName} from "../../../../_framework/util";
import {Option} from "../../0x1/option/structs";
import {PKG_V5} from "../index";
import {ID} from "../object/structs";
import {BcsType, bcs} from "@iota/iota-sdk/bcs";
import {IotaClient, IotaObjectData, IotaParsedData} from "@iota/iota-sdk/client";
import {fromB64, fromHEX, toHEX} from "@iota/iota-sdk/utils";

/* ============================== Borrow =============================== */

export function isBorrow(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V5}::borrow::Borrow`; }

export interface BorrowFields { ref: ToField<"address">; obj: ToField<ID> }

export type BorrowReified = Reified< Borrow, BorrowFields >;

export class Borrow implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::borrow::Borrow`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = Borrow.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::borrow::Borrow`; readonly $typeArgs: []; readonly $isPhantom = Borrow.$isPhantom;

 readonly ref: ToField<"address">; readonly obj: ToField<ID>

 private constructor(typeArgs: [], fields: BorrowFields, ) { this.$fullTypeName = composeIotaType( Borrow.$typeName, ...typeArgs ) as `${typeof PKG_V5}::borrow::Borrow`; this.$typeArgs = typeArgs;

 this.ref = fields.ref;; this.obj = fields.obj; }

 static reified( ): BorrowReified { return { typeName: Borrow.$typeName, fullTypeName: composeIotaType( Borrow.$typeName, ...[] ) as `${typeof PKG_V5}::borrow::Borrow`, typeArgs: [ ] as [], isPhantom: Borrow.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => Borrow.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => Borrow.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => Borrow.fromBcs( data, ), bcs: Borrow.bcs, fromJSONField: (field: any) => Borrow.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => Borrow.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => Borrow.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => Borrow.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => Borrow.fetch( client, id, ), new: ( fields: BorrowFields, ) => { return new Borrow( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return Borrow.reified() }

 static phantom( ): PhantomReified<ToTypeStr<Borrow>> { return phantom(Borrow.reified( )); } static get p() { return Borrow.phantom() }

 static get bcs() { return bcs.struct("Borrow", {

 ref: bcs.bytes(32).transform({ input: (val: string) => fromHEX(val), output: (val: Uint8Array) => toHEX(val), }), obj: ID.bcs

}) };

 static fromFields( fields: Record<string, any> ): Borrow { return Borrow.reified( ).new( { ref: decodeFromFields("address", fields.ref), obj: decodeFromFields(ID.reified(), fields.obj) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): Borrow { if (!isBorrow(item.type)) { throw new Error("not a Borrow type");

 }

 return Borrow.reified( ).new( { ref: decodeFromFieldsWithTypes("address", item.fields.ref), obj: decodeFromFieldsWithTypes(ID.reified(), item.fields.obj) } ) }

 static fromBcs( data: Uint8Array ): Borrow { return Borrow.fromFields( Borrow.bcs.parse(data) ) }

 toJSONField() { return {

 ref: this.ref,obj: this.obj,

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): Borrow { return Borrow.reified( ).new( { ref: decodeFromJSONField("address", field.ref), obj: decodeFromJSONField(ID.reified(), field.obj) } ) }

 static fromJSON( json: Record<string, any> ): Borrow { if (json.$typeName !== Borrow.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return Borrow.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): Borrow { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isBorrow(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a Borrow object`); } return Borrow.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): Borrow { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isBorrow(data.bcs.type)) { throw new Error(`object at is not a Borrow object`); }

 return Borrow.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return Borrow.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<Borrow> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching Borrow object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isBorrow(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a Borrow object`); }

 return Borrow.fromIotaObjectData( res.data ); }

 }

/* ============================== Referent =============================== */

export function isReferent(type: string): boolean { type = compressIotaType(type); return type.startsWith(`${PKG_V5}::borrow::Referent` + '<'); }

export interface ReferentFields<T0 extends TypeArgument> { id: ToField<"address">; value: ToField<Option<T0>> }

export type ReferentReified<T0 extends TypeArgument> = Reified< Referent<T0>, ReferentFields<T0> >;

export class Referent<T0 extends TypeArgument> implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::borrow::Referent`; static readonly $numTypeParams = 1; static readonly $isPhantom = [false,] as const;

 readonly $typeName = Referent.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::borrow::Referent<${ToTypeStr<T0>}>`; readonly $typeArgs: [ToTypeStr<T0>]; readonly $isPhantom = Referent.$isPhantom;

 readonly id: ToField<"address">; readonly value: ToField<Option<T0>>

 private constructor(typeArgs: [ToTypeStr<T0>], fields: ReferentFields<T0>, ) { this.$fullTypeName = composeIotaType( Referent.$typeName, ...typeArgs ) as `${typeof PKG_V5}::borrow::Referent<${ToTypeStr<T0>}>`; this.$typeArgs = typeArgs;

 this.id = fields.id;; this.value = fields.value; }

 static reified<T0 extends Reified<TypeArgument, any>>( T0: T0 ): ReferentReified<ToTypeArgument<T0>> { return { typeName: Referent.$typeName, fullTypeName: composeIotaType( Referent.$typeName, ...[extractType(T0)] ) as `${typeof PKG_V5}::borrow::Referent<${ToTypeStr<ToTypeArgument<T0>>}>`, typeArgs: [ extractType(T0) ] as [ToTypeStr<ToTypeArgument<T0>>], isPhantom: Referent.$isPhantom, reifiedTypeArgs: [T0], fromFields: (fields: Record<string, any>) => Referent.fromFields( T0, fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => Referent.fromFieldsWithTypes( T0, item, ), fromBcs: (data: Uint8Array) => Referent.fromBcs( T0, data, ), bcs: Referent.bcs(toBcs(T0)), fromJSONField: (field: any) => Referent.fromJSONField( T0, field, ), fromJSON: (json: Record<string, any>) => Referent.fromJSON( T0, json, ), fromIotaParsedData: (content: IotaParsedData) => Referent.fromIotaParsedData( T0, content, ), fromIotaObjectData: (content: IotaObjectData) => Referent.fromIotaObjectData( T0, content, ), fetch: async (client: IotaClient, id: string) => Referent.fetch( client, T0, id, ), new: ( fields: ReferentFields<ToTypeArgument<T0>>, ) => { return new Referent( [extractType(T0)], fields ) }, kind: "StructClassReified", } }

 static get r() { return Referent.reified }

 static phantom<T0 extends Reified<TypeArgument, any>>( T0: T0 ): PhantomReified<ToTypeStr<Referent<ToTypeArgument<T0>>>> { return phantom(Referent.reified( T0 )); } static get p() { return Referent.phantom }

 static get bcs() { return <T0 extends BcsType<any>>(T0: T0) => bcs.struct(`Referent<${T0.name}>`, {

 id: bcs.bytes(32).transform({ input: (val: string) => fromHEX(val), output: (val: Uint8Array) => toHEX(val), }), value: Option.bcs(T0)

}) };

 static fromFields<T0 extends Reified<TypeArgument, any>>( typeArg: T0, fields: Record<string, any> ): Referent<ToTypeArgument<T0>> { return Referent.reified( typeArg, ).new( { id: decodeFromFields("address", fields.id), value: decodeFromFields(Option.reified(typeArg), fields.value) } ) }

 static fromFieldsWithTypes<T0 extends Reified<TypeArgument, any>>( typeArg: T0, item: FieldsWithTypes ): Referent<ToTypeArgument<T0>> { if (!isReferent(item.type)) { throw new Error("not a Referent type");

 } assertFieldsWithTypesArgsMatch(item, [typeArg]);

 return Referent.reified( typeArg, ).new( { id: decodeFromFieldsWithTypes("address", item.fields.id), value: decodeFromFieldsWithTypes(Option.reified(typeArg), item.fields.value) } ) }

 static fromBcs<T0 extends Reified<TypeArgument, any>>( typeArg: T0, data: Uint8Array ): Referent<ToTypeArgument<T0>> { const typeArgs = [typeArg];

 return Referent.fromFields( typeArg, Referent.bcs( toBcs(typeArgs[0]) ).parse(data) ) }

 toJSONField() { return {

 id: this.id,value: this.value.toJSONField(),

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField<T0 extends Reified<TypeArgument, any>>( typeArg: T0, field: any ): Referent<ToTypeArgument<T0>> { return Referent.reified( typeArg, ).new( { id: decodeFromJSONField("address", field.id), value: decodeFromJSONField(Option.reified(typeArg), field.value) } ) }

 static fromJSON<T0 extends Reified<TypeArgument, any>>( typeArg: T0, json: Record<string, any> ): Referent<ToTypeArgument<T0>> { if (json.$typeName !== Referent.$typeName) { throw new Error("not a WithTwoGenerics json object") }; assertReifiedTypeArgsMatch( composeIotaType(Referent.$typeName, extractType(typeArg)), json.$typeArgs, [typeArg], )

 return Referent.fromJSONField( typeArg, json, ) }

 static fromIotaParsedData<T0 extends Reified<TypeArgument, any>>( typeArg: T0, content: IotaParsedData ): Referent<ToTypeArgument<T0>> { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isReferent(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a Referent object`); } return Referent.fromFieldsWithTypes( typeArg, content ); }

 static fromIotaObjectData<T0 extends Reified<TypeArgument, any>>( typeArg: T0, data: IotaObjectData ): Referent<ToTypeArgument<T0>> { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isReferent(data.bcs.type)) { throw new Error(`object at is not a Referent object`); }

 const gotTypeArgs = parseTypeName(data.bcs.type).typeArgs; if (gotTypeArgs.length !== 1) { throw new Error(`type argument mismatch: expected 1 type argument but got '${gotTypeArgs.length}'`); }; const gotTypeArg = compressIotaType(gotTypeArgs[0]); const expectedTypeArg = compressIotaType(extractType(typeArg)); if (gotTypeArg !== compressIotaType(extractType(typeArg))) { throw new Error(`type argument mismatch: expected '${expectedTypeArg}' but got '${gotTypeArg}'`); };

 return Referent.fromBcs( typeArg, fromB64(data.bcs.bcsBytes) ); } if (data.content) { return Referent.fromIotaParsedData( typeArg, data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch<T0 extends Reified<TypeArgument, any>>( client: IotaClient, typeArg: T0, id: string ): Promise<Referent<ToTypeArgument<T0>>> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching Referent object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isReferent(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a Referent object`); }

 return Referent.fromIotaObjectData( typeArg, res.data ); }

 }
