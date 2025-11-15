// @ts-nocheck
import {PhantomReified, PhantomToTypeStr, PhantomTypeArgument, Reified, StructClass, ToField, ToPhantomTypeArgument, ToTypeStr, assertFieldsWithTypesArgsMatch, assertReifiedTypeArgsMatch, decodeFromFields, decodeFromFieldsWithTypes, decodeFromJSONField, extractType, phantom} from "../../../../_framework/reified";
import {FieldsWithTypes, composeIotaType, compressIotaType, parseTypeName} from "../../../../_framework/util";
import {String as String1} from "../../0x1/ascii/structs";
import {Option} from "../../0x1/option/structs";
import {String} from "../../0x1/string/structs";
import {Balance, Supply} from "../balance/structs";
import {PKG_V5} from "../index";
import {ID, UID} from "../object/structs";
import {Url} from "../url/structs";
import {bcs} from "@iota/iota-sdk/bcs";
import {IotaClient, IotaObjectData, IotaParsedData} from "@iota/iota-sdk/client";
import {fromB64} from "@iota/iota-sdk/utils";

/* ============================== Coin =============================== */

export function isCoin(type: string): boolean { type = compressIotaType(type); return type.startsWith(`${PKG_V5}::coin::Coin` + '<'); }

export interface CoinFields<T0 extends PhantomTypeArgument> { id: ToField<UID>; balance: ToField<Balance<T0>> }

export type CoinReified<T0 extends PhantomTypeArgument> = Reified< Coin<T0>, CoinFields<T0> >;

export class Coin<T0 extends PhantomTypeArgument> implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::coin::Coin`; static readonly $numTypeParams = 1; static readonly $isPhantom = [true,] as const;

 readonly $typeName = Coin.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::coin::Coin<${PhantomToTypeStr<T0>}>`; readonly $typeArgs: [PhantomToTypeStr<T0>]; readonly $isPhantom = Coin.$isPhantom;

 readonly id: ToField<UID>; readonly balance: ToField<Balance<T0>>

 private constructor(typeArgs: [PhantomToTypeStr<T0>], fields: CoinFields<T0>, ) { this.$fullTypeName = composeIotaType( Coin.$typeName, ...typeArgs ) as `${typeof PKG_V5}::coin::Coin<${PhantomToTypeStr<T0>}>`; this.$typeArgs = typeArgs;

 this.id = fields.id;; this.balance = fields.balance; }

 static reified<T0 extends PhantomReified<PhantomTypeArgument>>( T0: T0 ): CoinReified<ToPhantomTypeArgument<T0>> { return { typeName: Coin.$typeName, fullTypeName: composeIotaType( Coin.$typeName, ...[extractType(T0)] ) as `${typeof PKG_V5}::coin::Coin<${PhantomToTypeStr<ToPhantomTypeArgument<T0>>}>`, typeArgs: [ extractType(T0) ] as [PhantomToTypeStr<ToPhantomTypeArgument<T0>>], isPhantom: Coin.$isPhantom, reifiedTypeArgs: [T0], fromFields: (fields: Record<string, any>) => Coin.fromFields( T0, fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => Coin.fromFieldsWithTypes( T0, item, ), fromBcs: (data: Uint8Array) => Coin.fromBcs( T0, data, ), bcs: Coin.bcs, fromJSONField: (field: any) => Coin.fromJSONField( T0, field, ), fromJSON: (json: Record<string, any>) => Coin.fromJSON( T0, json, ), fromIotaParsedData: (content: IotaParsedData) => Coin.fromIotaParsedData( T0, content, ), fromIotaObjectData: (content: IotaObjectData) => Coin.fromIotaObjectData( T0, content, ), fetch: async (client: IotaClient, id: string) => Coin.fetch( client, T0, id, ), new: ( fields: CoinFields<ToPhantomTypeArgument<T0>>, ) => { return new Coin( [extractType(T0)], fields ) }, kind: "StructClassReified", } }

 static get r() { return Coin.reified }

 static phantom<T0 extends PhantomReified<PhantomTypeArgument>>( T0: T0 ): PhantomReified<ToTypeStr<Coin<ToPhantomTypeArgument<T0>>>> { return phantom(Coin.reified( T0 )); } static get p() { return Coin.phantom }

 static get bcs() { return bcs.struct("Coin", {

 id: UID.bcs, balance: Balance.bcs

}) };

 static fromFields<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, fields: Record<string, any> ): Coin<ToPhantomTypeArgument<T0>> { return Coin.reified( typeArg, ).new( { id: decodeFromFields(UID.reified(), fields.id), balance: decodeFromFields(Balance.reified(typeArg), fields.balance) } ) }

 static fromFieldsWithTypes<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, item: FieldsWithTypes ): Coin<ToPhantomTypeArgument<T0>> { if (!isCoin(item.type)) { throw new Error("not a Coin type");

 } assertFieldsWithTypesArgsMatch(item, [typeArg]);

 return Coin.reified( typeArg, ).new( { id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id), balance: decodeFromFieldsWithTypes(Balance.reified(typeArg), item.fields.balance) } ) }

 static fromBcs<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, data: Uint8Array ): Coin<ToPhantomTypeArgument<T0>> { return Coin.fromFields( typeArg, Coin.bcs.parse(data) ) }

 toJSONField() { return {

 id: this.id,balance: this.balance.toJSONField(),

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, field: any ): Coin<ToPhantomTypeArgument<T0>> { return Coin.reified( typeArg, ).new( { id: decodeFromJSONField(UID.reified(), field.id), balance: decodeFromJSONField(Balance.reified(typeArg), field.balance) } ) }

 static fromJSON<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, json: Record<string, any> ): Coin<ToPhantomTypeArgument<T0>> { if (json.$typeName !== Coin.$typeName) { throw new Error("not a WithTwoGenerics json object") }; assertReifiedTypeArgsMatch( composeIotaType(Coin.$typeName, extractType(typeArg)), json.$typeArgs, [typeArg], )

 return Coin.fromJSONField( typeArg, json, ) }

 static fromIotaParsedData<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, content: IotaParsedData ): Coin<ToPhantomTypeArgument<T0>> { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isCoin(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a Coin object`); } return Coin.fromFieldsWithTypes( typeArg, content ); }

 static fromIotaObjectData<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, data: IotaObjectData ): Coin<ToPhantomTypeArgument<T0>> { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isCoin(data.bcs.type)) { throw new Error(`object at is not a Coin object`); }

 const gotTypeArgs = parseTypeName(data.bcs.type).typeArgs; if (gotTypeArgs.length !== 1) { throw new Error(`type argument mismatch: expected 1 type argument but got '${gotTypeArgs.length}'`); }; const gotTypeArg = compressIotaType(gotTypeArgs[0]); const expectedTypeArg = compressIotaType(extractType(typeArg)); if (gotTypeArg !== compressIotaType(extractType(typeArg))) { throw new Error(`type argument mismatch: expected '${expectedTypeArg}' but got '${gotTypeArg}'`); };

 return Coin.fromBcs( typeArg, fromB64(data.bcs.bcsBytes) ); } if (data.content) { return Coin.fromIotaParsedData( typeArg, data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch<T0 extends PhantomReified<PhantomTypeArgument>>( client: IotaClient, typeArg: T0, id: string ): Promise<Coin<ToPhantomTypeArgument<T0>>> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching Coin object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isCoin(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a Coin object`); }

 return Coin.fromIotaObjectData( typeArg, res.data ); }

 }

/* ============================== CoinMetadata =============================== */

export function isCoinMetadata(type: string): boolean { type = compressIotaType(type); return type.startsWith(`${PKG_V5}::coin::CoinMetadata` + '<'); }

export interface CoinMetadataFields<T0 extends PhantomTypeArgument> { id: ToField<UID>; decimals: ToField<"u8">; name: ToField<String>; symbol: ToField<String1>; description: ToField<String>; iconUrl: ToField<Option<Url>> }

export type CoinMetadataReified<T0 extends PhantomTypeArgument> = Reified< CoinMetadata<T0>, CoinMetadataFields<T0> >;

export class CoinMetadata<T0 extends PhantomTypeArgument> implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::coin::CoinMetadata`; static readonly $numTypeParams = 1; static readonly $isPhantom = [true,] as const;

 readonly $typeName = CoinMetadata.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::coin::CoinMetadata<${PhantomToTypeStr<T0>}>`; readonly $typeArgs: [PhantomToTypeStr<T0>]; readonly $isPhantom = CoinMetadata.$isPhantom;

 readonly id: ToField<UID>; readonly decimals: ToField<"u8">; readonly name: ToField<String>; readonly symbol: ToField<String1>; readonly description: ToField<String>; readonly iconUrl: ToField<Option<Url>>

 private constructor(typeArgs: [PhantomToTypeStr<T0>], fields: CoinMetadataFields<T0>, ) { this.$fullTypeName = composeIotaType( CoinMetadata.$typeName, ...typeArgs ) as `${typeof PKG_V5}::coin::CoinMetadata<${PhantomToTypeStr<T0>}>`; this.$typeArgs = typeArgs;

 this.id = fields.id;; this.decimals = fields.decimals;; this.name = fields.name;; this.symbol = fields.symbol;; this.description = fields.description;; this.iconUrl = fields.iconUrl; }

 static reified<T0 extends PhantomReified<PhantomTypeArgument>>( T0: T0 ): CoinMetadataReified<ToPhantomTypeArgument<T0>> { return { typeName: CoinMetadata.$typeName, fullTypeName: composeIotaType( CoinMetadata.$typeName, ...[extractType(T0)] ) as `${typeof PKG_V5}::coin::CoinMetadata<${PhantomToTypeStr<ToPhantomTypeArgument<T0>>}>`, typeArgs: [ extractType(T0) ] as [PhantomToTypeStr<ToPhantomTypeArgument<T0>>], isPhantom: CoinMetadata.$isPhantom, reifiedTypeArgs: [T0], fromFields: (fields: Record<string, any>) => CoinMetadata.fromFields( T0, fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => CoinMetadata.fromFieldsWithTypes( T0, item, ), fromBcs: (data: Uint8Array) => CoinMetadata.fromBcs( T0, data, ), bcs: CoinMetadata.bcs, fromJSONField: (field: any) => CoinMetadata.fromJSONField( T0, field, ), fromJSON: (json: Record<string, any>) => CoinMetadata.fromJSON( T0, json, ), fromIotaParsedData: (content: IotaParsedData) => CoinMetadata.fromIotaParsedData( T0, content, ), fromIotaObjectData: (content: IotaObjectData) => CoinMetadata.fromIotaObjectData( T0, content, ), fetch: async (client: IotaClient, id: string) => CoinMetadata.fetch( client, T0, id, ), new: ( fields: CoinMetadataFields<ToPhantomTypeArgument<T0>>, ) => { return new CoinMetadata( [extractType(T0)], fields ) }, kind: "StructClassReified", } }

 static get r() { return CoinMetadata.reified }

 static phantom<T0 extends PhantomReified<PhantomTypeArgument>>( T0: T0 ): PhantomReified<ToTypeStr<CoinMetadata<ToPhantomTypeArgument<T0>>>> { return phantom(CoinMetadata.reified( T0 )); } static get p() { return CoinMetadata.phantom }

 static get bcs() { return bcs.struct("CoinMetadata", {

 id: UID.bcs, decimals: bcs.u8(), name: String.bcs, symbol: String1.bcs, description: String.bcs, icon_url: Option.bcs(Url.bcs)

}) };

 static fromFields<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, fields: Record<string, any> ): CoinMetadata<ToPhantomTypeArgument<T0>> { return CoinMetadata.reified( typeArg, ).new( { id: decodeFromFields(UID.reified(), fields.id), decimals: decodeFromFields("u8", fields.decimals), name: decodeFromFields(String.reified(), fields.name), symbol: decodeFromFields(String1.reified(), fields.symbol), description: decodeFromFields(String.reified(), fields.description), iconUrl: decodeFromFields(Option.reified(Url.reified()), fields.icon_url) } ) }

 static fromFieldsWithTypes<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, item: FieldsWithTypes ): CoinMetadata<ToPhantomTypeArgument<T0>> { if (!isCoinMetadata(item.type)) { throw new Error("not a CoinMetadata type");

 } assertFieldsWithTypesArgsMatch(item, [typeArg]);

 return CoinMetadata.reified( typeArg, ).new( { id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id), decimals: decodeFromFieldsWithTypes("u8", item.fields.decimals), name: decodeFromFieldsWithTypes(String.reified(), item.fields.name), symbol: decodeFromFieldsWithTypes(String1.reified(), item.fields.symbol), description: decodeFromFieldsWithTypes(String.reified(), item.fields.description), iconUrl: decodeFromFieldsWithTypes(Option.reified(Url.reified()), item.fields.icon_url) } ) }

 static fromBcs<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, data: Uint8Array ): CoinMetadata<ToPhantomTypeArgument<T0>> { return CoinMetadata.fromFields( typeArg, CoinMetadata.bcs.parse(data) ) }

 toJSONField() { return {

 id: this.id,decimals: this.decimals,name: this.name,symbol: this.symbol,description: this.description,iconUrl: this.iconUrl.toJSONField(),

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, field: any ): CoinMetadata<ToPhantomTypeArgument<T0>> { return CoinMetadata.reified( typeArg, ).new( { id: decodeFromJSONField(UID.reified(), field.id), decimals: decodeFromJSONField("u8", field.decimals), name: decodeFromJSONField(String.reified(), field.name), symbol: decodeFromJSONField(String1.reified(), field.symbol), description: decodeFromJSONField(String.reified(), field.description), iconUrl: decodeFromJSONField(Option.reified(Url.reified()), field.iconUrl) } ) }

 static fromJSON<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, json: Record<string, any> ): CoinMetadata<ToPhantomTypeArgument<T0>> { if (json.$typeName !== CoinMetadata.$typeName) { throw new Error("not a WithTwoGenerics json object") }; assertReifiedTypeArgsMatch( composeIotaType(CoinMetadata.$typeName, extractType(typeArg)), json.$typeArgs, [typeArg], )

 return CoinMetadata.fromJSONField( typeArg, json, ) }

 static fromIotaParsedData<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, content: IotaParsedData ): CoinMetadata<ToPhantomTypeArgument<T0>> { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isCoinMetadata(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a CoinMetadata object`); } return CoinMetadata.fromFieldsWithTypes( typeArg, content ); }

 static fromIotaObjectData<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, data: IotaObjectData ): CoinMetadata<ToPhantomTypeArgument<T0>> { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isCoinMetadata(data.bcs.type)) { throw new Error(`object at is not a CoinMetadata object`); }

 const gotTypeArgs = parseTypeName(data.bcs.type).typeArgs; if (gotTypeArgs.length !== 1) { throw new Error(`type argument mismatch: expected 1 type argument but got '${gotTypeArgs.length}'`); }; const gotTypeArg = compressIotaType(gotTypeArgs[0]); const expectedTypeArg = compressIotaType(extractType(typeArg)); if (gotTypeArg !== compressIotaType(extractType(typeArg))) { throw new Error(`type argument mismatch: expected '${expectedTypeArg}' but got '${gotTypeArg}'`); };

 return CoinMetadata.fromBcs( typeArg, fromB64(data.bcs.bcsBytes) ); } if (data.content) { return CoinMetadata.fromIotaParsedData( typeArg, data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch<T0 extends PhantomReified<PhantomTypeArgument>>( client: IotaClient, typeArg: T0, id: string ): Promise<CoinMetadata<ToPhantomTypeArgument<T0>>> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching CoinMetadata object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isCoinMetadata(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a CoinMetadata object`); }

 return CoinMetadata.fromIotaObjectData( typeArg, res.data ); }

 }

/* ============================== DenyCapV1 =============================== */

export function isDenyCapV1(type: string): boolean { type = compressIotaType(type); return type.startsWith(`${PKG_V5}::coin::DenyCapV1` + '<'); }

export interface DenyCapV1Fields<T0 extends PhantomTypeArgument> { id: ToField<UID>; allowGlobalPause: ToField<"bool"> }

export type DenyCapV1Reified<T0 extends PhantomTypeArgument> = Reified< DenyCapV1<T0>, DenyCapV1Fields<T0> >;

export class DenyCapV1<T0 extends PhantomTypeArgument> implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::coin::DenyCapV1`; static readonly $numTypeParams = 1; static readonly $isPhantom = [true,] as const;

 readonly $typeName = DenyCapV1.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::coin::DenyCapV1<${PhantomToTypeStr<T0>}>`; readonly $typeArgs: [PhantomToTypeStr<T0>]; readonly $isPhantom = DenyCapV1.$isPhantom;

 readonly id: ToField<UID>; readonly allowGlobalPause: ToField<"bool">

 private constructor(typeArgs: [PhantomToTypeStr<T0>], fields: DenyCapV1Fields<T0>, ) { this.$fullTypeName = composeIotaType( DenyCapV1.$typeName, ...typeArgs ) as `${typeof PKG_V5}::coin::DenyCapV1<${PhantomToTypeStr<T0>}>`; this.$typeArgs = typeArgs;

 this.id = fields.id;; this.allowGlobalPause = fields.allowGlobalPause; }

 static reified<T0 extends PhantomReified<PhantomTypeArgument>>( T0: T0 ): DenyCapV1Reified<ToPhantomTypeArgument<T0>> { return { typeName: DenyCapV1.$typeName, fullTypeName: composeIotaType( DenyCapV1.$typeName, ...[extractType(T0)] ) as `${typeof PKG_V5}::coin::DenyCapV1<${PhantomToTypeStr<ToPhantomTypeArgument<T0>>}>`, typeArgs: [ extractType(T0) ] as [PhantomToTypeStr<ToPhantomTypeArgument<T0>>], isPhantom: DenyCapV1.$isPhantom, reifiedTypeArgs: [T0], fromFields: (fields: Record<string, any>) => DenyCapV1.fromFields( T0, fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => DenyCapV1.fromFieldsWithTypes( T0, item, ), fromBcs: (data: Uint8Array) => DenyCapV1.fromBcs( T0, data, ), bcs: DenyCapV1.bcs, fromJSONField: (field: any) => DenyCapV1.fromJSONField( T0, field, ), fromJSON: (json: Record<string, any>) => DenyCapV1.fromJSON( T0, json, ), fromIotaParsedData: (content: IotaParsedData) => DenyCapV1.fromIotaParsedData( T0, content, ), fromIotaObjectData: (content: IotaObjectData) => DenyCapV1.fromIotaObjectData( T0, content, ), fetch: async (client: IotaClient, id: string) => DenyCapV1.fetch( client, T0, id, ), new: ( fields: DenyCapV1Fields<ToPhantomTypeArgument<T0>>, ) => { return new DenyCapV1( [extractType(T0)], fields ) }, kind: "StructClassReified", } }

 static get r() { return DenyCapV1.reified }

 static phantom<T0 extends PhantomReified<PhantomTypeArgument>>( T0: T0 ): PhantomReified<ToTypeStr<DenyCapV1<ToPhantomTypeArgument<T0>>>> { return phantom(DenyCapV1.reified( T0 )); } static get p() { return DenyCapV1.phantom }

 static get bcs() { return bcs.struct("DenyCapV1", {

 id: UID.bcs, allow_global_pause: bcs.bool()

}) };

 static fromFields<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, fields: Record<string, any> ): DenyCapV1<ToPhantomTypeArgument<T0>> { return DenyCapV1.reified( typeArg, ).new( { id: decodeFromFields(UID.reified(), fields.id), allowGlobalPause: decodeFromFields("bool", fields.allow_global_pause) } ) }

 static fromFieldsWithTypes<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, item: FieldsWithTypes ): DenyCapV1<ToPhantomTypeArgument<T0>> { if (!isDenyCapV1(item.type)) { throw new Error("not a DenyCapV1 type");

 } assertFieldsWithTypesArgsMatch(item, [typeArg]);

 return DenyCapV1.reified( typeArg, ).new( { id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id), allowGlobalPause: decodeFromFieldsWithTypes("bool", item.fields.allow_global_pause) } ) }

 static fromBcs<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, data: Uint8Array ): DenyCapV1<ToPhantomTypeArgument<T0>> { return DenyCapV1.fromFields( typeArg, DenyCapV1.bcs.parse(data) ) }

 toJSONField() { return {

 id: this.id,allowGlobalPause: this.allowGlobalPause,

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, field: any ): DenyCapV1<ToPhantomTypeArgument<T0>> { return DenyCapV1.reified( typeArg, ).new( { id: decodeFromJSONField(UID.reified(), field.id), allowGlobalPause: decodeFromJSONField("bool", field.allowGlobalPause) } ) }

 static fromJSON<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, json: Record<string, any> ): DenyCapV1<ToPhantomTypeArgument<T0>> { if (json.$typeName !== DenyCapV1.$typeName) { throw new Error("not a WithTwoGenerics json object") }; assertReifiedTypeArgsMatch( composeIotaType(DenyCapV1.$typeName, extractType(typeArg)), json.$typeArgs, [typeArg], )

 return DenyCapV1.fromJSONField( typeArg, json, ) }

 static fromIotaParsedData<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, content: IotaParsedData ): DenyCapV1<ToPhantomTypeArgument<T0>> { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isDenyCapV1(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a DenyCapV1 object`); } return DenyCapV1.fromFieldsWithTypes( typeArg, content ); }

 static fromIotaObjectData<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, data: IotaObjectData ): DenyCapV1<ToPhantomTypeArgument<T0>> { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isDenyCapV1(data.bcs.type)) { throw new Error(`object at is not a DenyCapV1 object`); }

 const gotTypeArgs = parseTypeName(data.bcs.type).typeArgs; if (gotTypeArgs.length !== 1) { throw new Error(`type argument mismatch: expected 1 type argument but got '${gotTypeArgs.length}'`); }; const gotTypeArg = compressIotaType(gotTypeArgs[0]); const expectedTypeArg = compressIotaType(extractType(typeArg)); if (gotTypeArg !== compressIotaType(extractType(typeArg))) { throw new Error(`type argument mismatch: expected '${expectedTypeArg}' but got '${gotTypeArg}'`); };

 return DenyCapV1.fromBcs( typeArg, fromB64(data.bcs.bcsBytes) ); } if (data.content) { return DenyCapV1.fromIotaParsedData( typeArg, data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch<T0 extends PhantomReified<PhantomTypeArgument>>( client: IotaClient, typeArg: T0, id: string ): Promise<DenyCapV1<ToPhantomTypeArgument<T0>>> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching DenyCapV1 object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isDenyCapV1(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a DenyCapV1 object`); }

 return DenyCapV1.fromIotaObjectData( typeArg, res.data ); }

 }

/* ============================== RegulatedCoinMetadata =============================== */

export function isRegulatedCoinMetadata(type: string): boolean { type = compressIotaType(type); return type.startsWith(`${PKG_V5}::coin::RegulatedCoinMetadata` + '<'); }

export interface RegulatedCoinMetadataFields<T0 extends PhantomTypeArgument> { id: ToField<UID>; coinMetadataObject: ToField<ID>; denyCapObject: ToField<ID> }

export type RegulatedCoinMetadataReified<T0 extends PhantomTypeArgument> = Reified< RegulatedCoinMetadata<T0>, RegulatedCoinMetadataFields<T0> >;

export class RegulatedCoinMetadata<T0 extends PhantomTypeArgument> implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::coin::RegulatedCoinMetadata`; static readonly $numTypeParams = 1; static readonly $isPhantom = [true,] as const;

 readonly $typeName = RegulatedCoinMetadata.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::coin::RegulatedCoinMetadata<${PhantomToTypeStr<T0>}>`; readonly $typeArgs: [PhantomToTypeStr<T0>]; readonly $isPhantom = RegulatedCoinMetadata.$isPhantom;

 readonly id: ToField<UID>; readonly coinMetadataObject: ToField<ID>; readonly denyCapObject: ToField<ID>

 private constructor(typeArgs: [PhantomToTypeStr<T0>], fields: RegulatedCoinMetadataFields<T0>, ) { this.$fullTypeName = composeIotaType( RegulatedCoinMetadata.$typeName, ...typeArgs ) as `${typeof PKG_V5}::coin::RegulatedCoinMetadata<${PhantomToTypeStr<T0>}>`; this.$typeArgs = typeArgs;

 this.id = fields.id;; this.coinMetadataObject = fields.coinMetadataObject;; this.denyCapObject = fields.denyCapObject; }

 static reified<T0 extends PhantomReified<PhantomTypeArgument>>( T0: T0 ): RegulatedCoinMetadataReified<ToPhantomTypeArgument<T0>> { return { typeName: RegulatedCoinMetadata.$typeName, fullTypeName: composeIotaType( RegulatedCoinMetadata.$typeName, ...[extractType(T0)] ) as `${typeof PKG_V5}::coin::RegulatedCoinMetadata<${PhantomToTypeStr<ToPhantomTypeArgument<T0>>}>`, typeArgs: [ extractType(T0) ] as [PhantomToTypeStr<ToPhantomTypeArgument<T0>>], isPhantom: RegulatedCoinMetadata.$isPhantom, reifiedTypeArgs: [T0], fromFields: (fields: Record<string, any>) => RegulatedCoinMetadata.fromFields( T0, fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => RegulatedCoinMetadata.fromFieldsWithTypes( T0, item, ), fromBcs: (data: Uint8Array) => RegulatedCoinMetadata.fromBcs( T0, data, ), bcs: RegulatedCoinMetadata.bcs, fromJSONField: (field: any) => RegulatedCoinMetadata.fromJSONField( T0, field, ), fromJSON: (json: Record<string, any>) => RegulatedCoinMetadata.fromJSON( T0, json, ), fromIotaParsedData: (content: IotaParsedData) => RegulatedCoinMetadata.fromIotaParsedData( T0, content, ), fromIotaObjectData: (content: IotaObjectData) => RegulatedCoinMetadata.fromIotaObjectData( T0, content, ), fetch: async (client: IotaClient, id: string) => RegulatedCoinMetadata.fetch( client, T0, id, ), new: ( fields: RegulatedCoinMetadataFields<ToPhantomTypeArgument<T0>>, ) => { return new RegulatedCoinMetadata( [extractType(T0)], fields ) }, kind: "StructClassReified", } }

 static get r() { return RegulatedCoinMetadata.reified }

 static phantom<T0 extends PhantomReified<PhantomTypeArgument>>( T0: T0 ): PhantomReified<ToTypeStr<RegulatedCoinMetadata<ToPhantomTypeArgument<T0>>>> { return phantom(RegulatedCoinMetadata.reified( T0 )); } static get p() { return RegulatedCoinMetadata.phantom }

 static get bcs() { return bcs.struct("RegulatedCoinMetadata", {

 id: UID.bcs, coin_metadata_object: ID.bcs, deny_cap_object: ID.bcs

}) };

 static fromFields<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, fields: Record<string, any> ): RegulatedCoinMetadata<ToPhantomTypeArgument<T0>> { return RegulatedCoinMetadata.reified( typeArg, ).new( { id: decodeFromFields(UID.reified(), fields.id), coinMetadataObject: decodeFromFields(ID.reified(), fields.coin_metadata_object), denyCapObject: decodeFromFields(ID.reified(), fields.deny_cap_object) } ) }

 static fromFieldsWithTypes<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, item: FieldsWithTypes ): RegulatedCoinMetadata<ToPhantomTypeArgument<T0>> { if (!isRegulatedCoinMetadata(item.type)) { throw new Error("not a RegulatedCoinMetadata type");

 } assertFieldsWithTypesArgsMatch(item, [typeArg]);

 return RegulatedCoinMetadata.reified( typeArg, ).new( { id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id), coinMetadataObject: decodeFromFieldsWithTypes(ID.reified(), item.fields.coin_metadata_object), denyCapObject: decodeFromFieldsWithTypes(ID.reified(), item.fields.deny_cap_object) } ) }

 static fromBcs<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, data: Uint8Array ): RegulatedCoinMetadata<ToPhantomTypeArgument<T0>> { return RegulatedCoinMetadata.fromFields( typeArg, RegulatedCoinMetadata.bcs.parse(data) ) }

 toJSONField() { return {

 id: this.id,coinMetadataObject: this.coinMetadataObject,denyCapObject: this.denyCapObject,

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, field: any ): RegulatedCoinMetadata<ToPhantomTypeArgument<T0>> { return RegulatedCoinMetadata.reified( typeArg, ).new( { id: decodeFromJSONField(UID.reified(), field.id), coinMetadataObject: decodeFromJSONField(ID.reified(), field.coinMetadataObject), denyCapObject: decodeFromJSONField(ID.reified(), field.denyCapObject) } ) }

 static fromJSON<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, json: Record<string, any> ): RegulatedCoinMetadata<ToPhantomTypeArgument<T0>> { if (json.$typeName !== RegulatedCoinMetadata.$typeName) { throw new Error("not a WithTwoGenerics json object") }; assertReifiedTypeArgsMatch( composeIotaType(RegulatedCoinMetadata.$typeName, extractType(typeArg)), json.$typeArgs, [typeArg], )

 return RegulatedCoinMetadata.fromJSONField( typeArg, json, ) }

 static fromIotaParsedData<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, content: IotaParsedData ): RegulatedCoinMetadata<ToPhantomTypeArgument<T0>> { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isRegulatedCoinMetadata(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a RegulatedCoinMetadata object`); } return RegulatedCoinMetadata.fromFieldsWithTypes( typeArg, content ); }

 static fromIotaObjectData<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, data: IotaObjectData ): RegulatedCoinMetadata<ToPhantomTypeArgument<T0>> { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isRegulatedCoinMetadata(data.bcs.type)) { throw new Error(`object at is not a RegulatedCoinMetadata object`); }

 const gotTypeArgs = parseTypeName(data.bcs.type).typeArgs; if (gotTypeArgs.length !== 1) { throw new Error(`type argument mismatch: expected 1 type argument but got '${gotTypeArgs.length}'`); }; const gotTypeArg = compressIotaType(gotTypeArgs[0]); const expectedTypeArg = compressIotaType(extractType(typeArg)); if (gotTypeArg !== compressIotaType(extractType(typeArg))) { throw new Error(`type argument mismatch: expected '${expectedTypeArg}' but got '${gotTypeArg}'`); };

 return RegulatedCoinMetadata.fromBcs( typeArg, fromB64(data.bcs.bcsBytes) ); } if (data.content) { return RegulatedCoinMetadata.fromIotaParsedData( typeArg, data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch<T0 extends PhantomReified<PhantomTypeArgument>>( client: IotaClient, typeArg: T0, id: string ): Promise<RegulatedCoinMetadata<ToPhantomTypeArgument<T0>>> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching RegulatedCoinMetadata object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isRegulatedCoinMetadata(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a RegulatedCoinMetadata object`); }

 return RegulatedCoinMetadata.fromIotaObjectData( typeArg, res.data ); }

 }

/* ============================== TreasuryCap =============================== */

export function isTreasuryCap(type: string): boolean { type = compressIotaType(type); return type.startsWith(`${PKG_V5}::coin::TreasuryCap` + '<'); }

export interface TreasuryCapFields<T0 extends PhantomTypeArgument> { id: ToField<UID>; totalSupply: ToField<Supply<T0>> }

export type TreasuryCapReified<T0 extends PhantomTypeArgument> = Reified< TreasuryCap<T0>, TreasuryCapFields<T0> >;

export class TreasuryCap<T0 extends PhantomTypeArgument> implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::coin::TreasuryCap`; static readonly $numTypeParams = 1; static readonly $isPhantom = [true,] as const;

 readonly $typeName = TreasuryCap.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::coin::TreasuryCap<${PhantomToTypeStr<T0>}>`; readonly $typeArgs: [PhantomToTypeStr<T0>]; readonly $isPhantom = TreasuryCap.$isPhantom;

 readonly id: ToField<UID>; readonly totalSupply: ToField<Supply<T0>>

 private constructor(typeArgs: [PhantomToTypeStr<T0>], fields: TreasuryCapFields<T0>, ) { this.$fullTypeName = composeIotaType( TreasuryCap.$typeName, ...typeArgs ) as `${typeof PKG_V5}::coin::TreasuryCap<${PhantomToTypeStr<T0>}>`; this.$typeArgs = typeArgs;

 this.id = fields.id;; this.totalSupply = fields.totalSupply; }

 static reified<T0 extends PhantomReified<PhantomTypeArgument>>( T0: T0 ): TreasuryCapReified<ToPhantomTypeArgument<T0>> { return { typeName: TreasuryCap.$typeName, fullTypeName: composeIotaType( TreasuryCap.$typeName, ...[extractType(T0)] ) as `${typeof PKG_V5}::coin::TreasuryCap<${PhantomToTypeStr<ToPhantomTypeArgument<T0>>}>`, typeArgs: [ extractType(T0) ] as [PhantomToTypeStr<ToPhantomTypeArgument<T0>>], isPhantom: TreasuryCap.$isPhantom, reifiedTypeArgs: [T0], fromFields: (fields: Record<string, any>) => TreasuryCap.fromFields( T0, fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => TreasuryCap.fromFieldsWithTypes( T0, item, ), fromBcs: (data: Uint8Array) => TreasuryCap.fromBcs( T0, data, ), bcs: TreasuryCap.bcs, fromJSONField: (field: any) => TreasuryCap.fromJSONField( T0, field, ), fromJSON: (json: Record<string, any>) => TreasuryCap.fromJSON( T0, json, ), fromIotaParsedData: (content: IotaParsedData) => TreasuryCap.fromIotaParsedData( T0, content, ), fromIotaObjectData: (content: IotaObjectData) => TreasuryCap.fromIotaObjectData( T0, content, ), fetch: async (client: IotaClient, id: string) => TreasuryCap.fetch( client, T0, id, ), new: ( fields: TreasuryCapFields<ToPhantomTypeArgument<T0>>, ) => { return new TreasuryCap( [extractType(T0)], fields ) }, kind: "StructClassReified", } }

 static get r() { return TreasuryCap.reified }

 static phantom<T0 extends PhantomReified<PhantomTypeArgument>>( T0: T0 ): PhantomReified<ToTypeStr<TreasuryCap<ToPhantomTypeArgument<T0>>>> { return phantom(TreasuryCap.reified( T0 )); } static get p() { return TreasuryCap.phantom }

 static get bcs() { return bcs.struct("TreasuryCap", {

 id: UID.bcs, total_supply: Supply.bcs

}) };

 static fromFields<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, fields: Record<string, any> ): TreasuryCap<ToPhantomTypeArgument<T0>> { return TreasuryCap.reified( typeArg, ).new( { id: decodeFromFields(UID.reified(), fields.id), totalSupply: decodeFromFields(Supply.reified(typeArg), fields.total_supply) } ) }

 static fromFieldsWithTypes<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, item: FieldsWithTypes ): TreasuryCap<ToPhantomTypeArgument<T0>> { if (!isTreasuryCap(item.type)) { throw new Error("not a TreasuryCap type");

 } assertFieldsWithTypesArgsMatch(item, [typeArg]);

 return TreasuryCap.reified( typeArg, ).new( { id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id), totalSupply: decodeFromFieldsWithTypes(Supply.reified(typeArg), item.fields.total_supply) } ) }

 static fromBcs<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, data: Uint8Array ): TreasuryCap<ToPhantomTypeArgument<T0>> { return TreasuryCap.fromFields( typeArg, TreasuryCap.bcs.parse(data) ) }

 toJSONField() { return {

 id: this.id,totalSupply: this.totalSupply.toJSONField(),

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, field: any ): TreasuryCap<ToPhantomTypeArgument<T0>> { return TreasuryCap.reified( typeArg, ).new( { id: decodeFromJSONField(UID.reified(), field.id), totalSupply: decodeFromJSONField(Supply.reified(typeArg), field.totalSupply) } ) }

 static fromJSON<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, json: Record<string, any> ): TreasuryCap<ToPhantomTypeArgument<T0>> { if (json.$typeName !== TreasuryCap.$typeName) { throw new Error("not a WithTwoGenerics json object") }; assertReifiedTypeArgsMatch( composeIotaType(TreasuryCap.$typeName, extractType(typeArg)), json.$typeArgs, [typeArg], )

 return TreasuryCap.fromJSONField( typeArg, json, ) }

 static fromIotaParsedData<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, content: IotaParsedData ): TreasuryCap<ToPhantomTypeArgument<T0>> { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isTreasuryCap(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a TreasuryCap object`); } return TreasuryCap.fromFieldsWithTypes( typeArg, content ); }

 static fromIotaObjectData<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, data: IotaObjectData ): TreasuryCap<ToPhantomTypeArgument<T0>> { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isTreasuryCap(data.bcs.type)) { throw new Error(`object at is not a TreasuryCap object`); }

 const gotTypeArgs = parseTypeName(data.bcs.type).typeArgs; if (gotTypeArgs.length !== 1) { throw new Error(`type argument mismatch: expected 1 type argument but got '${gotTypeArgs.length}'`); }; const gotTypeArg = compressIotaType(gotTypeArgs[0]); const expectedTypeArg = compressIotaType(extractType(typeArg)); if (gotTypeArg !== compressIotaType(extractType(typeArg))) { throw new Error(`type argument mismatch: expected '${expectedTypeArg}' but got '${gotTypeArg}'`); };

 return TreasuryCap.fromBcs( typeArg, fromB64(data.bcs.bcsBytes) ); } if (data.content) { return TreasuryCap.fromIotaParsedData( typeArg, data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch<T0 extends PhantomReified<PhantomTypeArgument>>( client: IotaClient, typeArg: T0, id: string ): Promise<TreasuryCap<ToPhantomTypeArgument<T0>>> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching TreasuryCap object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isTreasuryCap(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a TreasuryCap object`); }

 return TreasuryCap.fromIotaObjectData( typeArg, res.data ); }

 }
