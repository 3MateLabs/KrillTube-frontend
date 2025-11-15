import {PhantomReified, PhantomToTypeStr, PhantomTypeArgument, Reified, StructClass, ToField, ToPhantomTypeArgument, ToTypeStr, assertFieldsWithTypesArgsMatch, assertReifiedTypeArgsMatch, decodeFromFields, decodeFromFieldsWithTypes, decodeFromJSONField, extractType, phantom} from "../../../../_framework/reified";
import {FieldsWithTypes, composeIotaType, compressIotaType, parseTypeName} from "../../../../_framework/util";
import {String} from "../../0x1/ascii/structs";
import {Option} from "../../0x1/option/structs";
import {String as String1} from "../../0x1/string/structs";
import {CoinMetadata, TreasuryCap} from "../coin/structs";
import {PKG_V5} from "../index";
import {UID} from "../object/structs";
import {Url} from "../url/structs";
import {bcs} from "@iota/iota-sdk/bcs";
import {IotaClient, IotaObjectData, IotaParsedData} from "@iota/iota-sdk/client";
import {fromB64} from "@iota/iota-sdk/utils";

/* ============================== CoinManaged =============================== */

export function isCoinManaged(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V5}::coin_manager::CoinManaged`; }

export interface CoinManagedFields { coinName: ToField<String> }

export type CoinManagedReified = Reified< CoinManaged, CoinManagedFields >;

export class CoinManaged implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::coin_manager::CoinManaged`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = CoinManaged.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::coin_manager::CoinManaged`; readonly $typeArgs: []; readonly $isPhantom = CoinManaged.$isPhantom;

 readonly coinName: ToField<String>

 private constructor(typeArgs: [], fields: CoinManagedFields, ) { this.$fullTypeName = composeIotaType( CoinManaged.$typeName, ...typeArgs ) as `${typeof PKG_V5}::coin_manager::CoinManaged`; this.$typeArgs = typeArgs;

 this.coinName = fields.coinName; }

 static reified( ): CoinManagedReified { return { typeName: CoinManaged.$typeName, fullTypeName: composeIotaType( CoinManaged.$typeName, ...[] ) as `${typeof PKG_V5}::coin_manager::CoinManaged`, typeArgs: [ ] as [], isPhantom: CoinManaged.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => CoinManaged.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => CoinManaged.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => CoinManaged.fromBcs( data, ), bcs: CoinManaged.bcs, fromJSONField: (field: any) => CoinManaged.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => CoinManaged.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => CoinManaged.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => CoinManaged.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => CoinManaged.fetch( client, id, ), new: ( fields: CoinManagedFields, ) => { return new CoinManaged( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return CoinManaged.reified() }

 static phantom( ): PhantomReified<ToTypeStr<CoinManaged>> { return phantom(CoinManaged.reified( )); } static get p() { return CoinManaged.phantom() }

 static get bcs() { return bcs.struct("CoinManaged", {

 coin_name: String.bcs

}) };

 static fromFields( fields: Record<string, any> ): CoinManaged { return CoinManaged.reified( ).new( { coinName: decodeFromFields(String.reified(), fields.coin_name) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): CoinManaged { if (!isCoinManaged(item.type)) { throw new Error("not a CoinManaged type");

 }

 return CoinManaged.reified( ).new( { coinName: decodeFromFieldsWithTypes(String.reified(), item.fields.coin_name) } ) }

 static fromBcs( data: Uint8Array ): CoinManaged { return CoinManaged.fromFields( CoinManaged.bcs.parse(data) ) }

 toJSONField() { return {

 coinName: this.coinName,

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): CoinManaged { return CoinManaged.reified( ).new( { coinName: decodeFromJSONField(String.reified(), field.coinName) } ) }

 static fromJSON( json: Record<string, any> ): CoinManaged { if (json.$typeName !== CoinManaged.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return CoinManaged.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): CoinManaged { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isCoinManaged(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a CoinManaged object`); } return CoinManaged.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): CoinManaged { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isCoinManaged(data.bcs.type)) { throw new Error(`object at is not a CoinManaged object`); }

 return CoinManaged.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return CoinManaged.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<CoinManaged> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching CoinManaged object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isCoinManaged(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a CoinManaged object`); }

 return CoinManaged.fromIotaObjectData( res.data ); }

 }

/* ============================== CoinManager =============================== */

export function isCoinManager(type: string): boolean { type = compressIotaType(type); return type.startsWith(`${PKG_V5}::coin_manager::CoinManager` + '<'); }

export interface CoinManagerFields<T0 extends PhantomTypeArgument> { id: ToField<UID>; treasuryCap: ToField<TreasuryCap<T0>>; metadata: ToField<Option<CoinMetadata<T0>>>; immutableMetadata: ToField<Option<ImmutableCoinMetadata<T0>>>; maximumSupply: ToField<Option<"u64">>; supplyImmutable: ToField<"bool">; metadataImmutable: ToField<"bool"> }

export type CoinManagerReified<T0 extends PhantomTypeArgument> = Reified< CoinManager<T0>, CoinManagerFields<T0> >;

export class CoinManager<T0 extends PhantomTypeArgument> implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::coin_manager::CoinManager`; static readonly $numTypeParams = 1; static readonly $isPhantom = [true,] as const;

 readonly $typeName = CoinManager.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::coin_manager::CoinManager<${PhantomToTypeStr<T0>}>`; readonly $typeArgs: [PhantomToTypeStr<T0>]; readonly $isPhantom = CoinManager.$isPhantom;

 readonly id: ToField<UID>; readonly treasuryCap: ToField<TreasuryCap<T0>>; readonly metadata: ToField<Option<CoinMetadata<T0>>>; readonly immutableMetadata: ToField<Option<ImmutableCoinMetadata<T0>>>; readonly maximumSupply: ToField<Option<"u64">>; readonly supplyImmutable: ToField<"bool">; readonly metadataImmutable: ToField<"bool">

 private constructor(typeArgs: [PhantomToTypeStr<T0>], fields: CoinManagerFields<T0>, ) { this.$fullTypeName = composeIotaType( CoinManager.$typeName, ...typeArgs ) as `${typeof PKG_V5}::coin_manager::CoinManager<${PhantomToTypeStr<T0>}>`; this.$typeArgs = typeArgs;

 this.id = fields.id;; this.treasuryCap = fields.treasuryCap;; this.metadata = fields.metadata;; this.immutableMetadata = fields.immutableMetadata;; this.maximumSupply = fields.maximumSupply;; this.supplyImmutable = fields.supplyImmutable;; this.metadataImmutable = fields.metadataImmutable; }

 static reified<T0 extends PhantomReified<PhantomTypeArgument>>( T0: T0 ): CoinManagerReified<ToPhantomTypeArgument<T0>> { return { typeName: CoinManager.$typeName, fullTypeName: composeIotaType( CoinManager.$typeName, ...[extractType(T0)] ) as `${typeof PKG_V5}::coin_manager::CoinManager<${PhantomToTypeStr<ToPhantomTypeArgument<T0>>}>`, typeArgs: [ extractType(T0) ] as [PhantomToTypeStr<ToPhantomTypeArgument<T0>>], isPhantom: CoinManager.$isPhantom, reifiedTypeArgs: [T0], fromFields: (fields: Record<string, any>) => CoinManager.fromFields( T0, fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => CoinManager.fromFieldsWithTypes( T0, item, ), fromBcs: (data: Uint8Array) => CoinManager.fromBcs( T0, data, ), bcs: CoinManager.bcs, fromJSONField: (field: any) => CoinManager.fromJSONField( T0, field, ), fromJSON: (json: Record<string, any>) => CoinManager.fromJSON( T0, json, ), fromIotaParsedData: (content: IotaParsedData) => CoinManager.fromIotaParsedData( T0, content, ), fromIotaObjectData: (content: IotaObjectData) => CoinManager.fromIotaObjectData( T0, content, ), fetch: async (client: IotaClient, id: string) => CoinManager.fetch( client, T0, id, ), new: ( fields: CoinManagerFields<ToPhantomTypeArgument<T0>>, ) => { return new CoinManager( [extractType(T0)], fields ) }, kind: "StructClassReified", } }

 static get r() { return CoinManager.reified }

 static phantom<T0 extends PhantomReified<PhantomTypeArgument>>( T0: T0 ): PhantomReified<ToTypeStr<CoinManager<ToPhantomTypeArgument<T0>>>> { return phantom(CoinManager.reified( T0 )); } static get p() { return CoinManager.phantom }

 static get bcs() { return bcs.struct("CoinManager", {

 id: UID.bcs, treasury_cap: TreasuryCap.bcs, metadata: Option.bcs(CoinMetadata.bcs), immutable_metadata: Option.bcs(ImmutableCoinMetadata.bcs), maximum_supply: Option.bcs(bcs.u64()), supply_immutable: bcs.bool(), metadata_immutable: bcs.bool()

}) };

 static fromFields<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, fields: Record<string, any> ): CoinManager<ToPhantomTypeArgument<T0>> { return CoinManager.reified( typeArg, ).new( { id: decodeFromFields(UID.reified(), fields.id), treasuryCap: decodeFromFields(TreasuryCap.reified(typeArg), fields.treasury_cap), metadata: decodeFromFields(Option.reified(CoinMetadata.reified(typeArg)), fields.metadata), immutableMetadata: decodeFromFields(Option.reified(ImmutableCoinMetadata.reified(typeArg)), fields.immutable_metadata), maximumSupply: decodeFromFields(Option.reified("u64"), fields.maximum_supply), supplyImmutable: decodeFromFields("bool", fields.supply_immutable), metadataImmutable: decodeFromFields("bool", fields.metadata_immutable) } ) }

 static fromFieldsWithTypes<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, item: FieldsWithTypes ): CoinManager<ToPhantomTypeArgument<T0>> { if (!isCoinManager(item.type)) { throw new Error("not a CoinManager type");

 } assertFieldsWithTypesArgsMatch(item, [typeArg]);

 return CoinManager.reified( typeArg, ).new( { id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id), treasuryCap: decodeFromFieldsWithTypes(TreasuryCap.reified(typeArg), item.fields.treasury_cap), metadata: decodeFromFieldsWithTypes(Option.reified(CoinMetadata.reified(typeArg)), item.fields.metadata), immutableMetadata: decodeFromFieldsWithTypes(Option.reified(ImmutableCoinMetadata.reified(typeArg)), item.fields.immutable_metadata), maximumSupply: decodeFromFieldsWithTypes(Option.reified("u64"), item.fields.maximum_supply), supplyImmutable: decodeFromFieldsWithTypes("bool", item.fields.supply_immutable), metadataImmutable: decodeFromFieldsWithTypes("bool", item.fields.metadata_immutable) } ) }

 static fromBcs<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, data: Uint8Array ): CoinManager<ToPhantomTypeArgument<T0>> { return CoinManager.fromFields( typeArg, CoinManager.bcs.parse(data) ) }

 toJSONField() { return {

 id: this.id,treasuryCap: this.treasuryCap.toJSONField(),metadata: this.metadata.toJSONField(),immutableMetadata: this.immutableMetadata.toJSONField(),maximumSupply: this.maximumSupply.toJSONField(),supplyImmutable: this.supplyImmutable,metadataImmutable: this.metadataImmutable,

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, field: any ): CoinManager<ToPhantomTypeArgument<T0>> { return CoinManager.reified( typeArg, ).new( { id: decodeFromJSONField(UID.reified(), field.id), treasuryCap: decodeFromJSONField(TreasuryCap.reified(typeArg), field.treasuryCap), metadata: decodeFromJSONField(Option.reified(CoinMetadata.reified(typeArg)), field.metadata), immutableMetadata: decodeFromJSONField(Option.reified(ImmutableCoinMetadata.reified(typeArg)), field.immutableMetadata), maximumSupply: decodeFromJSONField(Option.reified("u64"), field.maximumSupply), supplyImmutable: decodeFromJSONField("bool", field.supplyImmutable), metadataImmutable: decodeFromJSONField("bool", field.metadataImmutable) } ) }

 static fromJSON<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, json: Record<string, any> ): CoinManager<ToPhantomTypeArgument<T0>> { if (json.$typeName !== CoinManager.$typeName) { throw new Error("not a WithTwoGenerics json object") }; assertReifiedTypeArgsMatch( composeIotaType(CoinManager.$typeName, extractType(typeArg)), json.$typeArgs, [typeArg], )

 return CoinManager.fromJSONField( typeArg, json, ) }

 static fromIotaParsedData<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, content: IotaParsedData ): CoinManager<ToPhantomTypeArgument<T0>> { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isCoinManager(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a CoinManager object`); } return CoinManager.fromFieldsWithTypes( typeArg, content ); }

 static fromIotaObjectData<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, data: IotaObjectData ): CoinManager<ToPhantomTypeArgument<T0>> { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isCoinManager(data.bcs.type)) { throw new Error(`object at is not a CoinManager object`); }

 const gotTypeArgs = parseTypeName(data.bcs.type).typeArgs; if (gotTypeArgs.length !== 1) { throw new Error(`type argument mismatch: expected 1 type argument but got '${gotTypeArgs.length}'`); }; const gotTypeArg = compressIotaType(gotTypeArgs[0]); const expectedTypeArg = compressIotaType(extractType(typeArg)); if (gotTypeArg !== compressIotaType(extractType(typeArg))) { throw new Error(`type argument mismatch: expected '${expectedTypeArg}' but got '${gotTypeArg}'`); };

 return CoinManager.fromBcs( typeArg, fromB64(data.bcs.bcsBytes) ); } if (data.content) { return CoinManager.fromIotaParsedData( typeArg, data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch<T0 extends PhantomReified<PhantomTypeArgument>>( client: IotaClient, typeArg: T0, id: string ): Promise<CoinManager<ToPhantomTypeArgument<T0>>> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching CoinManager object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isCoinManager(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a CoinManager object`); }

 return CoinManager.fromIotaObjectData( typeArg, res.data ); }

 }

/* ============================== CoinManagerMetadataCap =============================== */

export function isCoinManagerMetadataCap(type: string): boolean { type = compressIotaType(type); return type.startsWith(`${PKG_V5}::coin_manager::CoinManagerMetadataCap` + '<'); }

export interface CoinManagerMetadataCapFields<T0 extends PhantomTypeArgument> { id: ToField<UID> }

export type CoinManagerMetadataCapReified<T0 extends PhantomTypeArgument> = Reified< CoinManagerMetadataCap<T0>, CoinManagerMetadataCapFields<T0> >;

export class CoinManagerMetadataCap<T0 extends PhantomTypeArgument> implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::coin_manager::CoinManagerMetadataCap`; static readonly $numTypeParams = 1; static readonly $isPhantom = [true,] as const;

 readonly $typeName = CoinManagerMetadataCap.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::coin_manager::CoinManagerMetadataCap<${PhantomToTypeStr<T0>}>`; readonly $typeArgs: [PhantomToTypeStr<T0>]; readonly $isPhantom = CoinManagerMetadataCap.$isPhantom;

 readonly id: ToField<UID>

 private constructor(typeArgs: [PhantomToTypeStr<T0>], fields: CoinManagerMetadataCapFields<T0>, ) { this.$fullTypeName = composeIotaType( CoinManagerMetadataCap.$typeName, ...typeArgs ) as `${typeof PKG_V5}::coin_manager::CoinManagerMetadataCap<${PhantomToTypeStr<T0>}>`; this.$typeArgs = typeArgs;

 this.id = fields.id; }

 static reified<T0 extends PhantomReified<PhantomTypeArgument>>( T0: T0 ): CoinManagerMetadataCapReified<ToPhantomTypeArgument<T0>> { return { typeName: CoinManagerMetadataCap.$typeName, fullTypeName: composeIotaType( CoinManagerMetadataCap.$typeName, ...[extractType(T0)] ) as `${typeof PKG_V5}::coin_manager::CoinManagerMetadataCap<${PhantomToTypeStr<ToPhantomTypeArgument<T0>>}>`, typeArgs: [ extractType(T0) ] as [PhantomToTypeStr<ToPhantomTypeArgument<T0>>], isPhantom: CoinManagerMetadataCap.$isPhantom, reifiedTypeArgs: [T0], fromFields: (fields: Record<string, any>) => CoinManagerMetadataCap.fromFields( T0, fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => CoinManagerMetadataCap.fromFieldsWithTypes( T0, item, ), fromBcs: (data: Uint8Array) => CoinManagerMetadataCap.fromBcs( T0, data, ), bcs: CoinManagerMetadataCap.bcs, fromJSONField: (field: any) => CoinManagerMetadataCap.fromJSONField( T0, field, ), fromJSON: (json: Record<string, any>) => CoinManagerMetadataCap.fromJSON( T0, json, ), fromIotaParsedData: (content: IotaParsedData) => CoinManagerMetadataCap.fromIotaParsedData( T0, content, ), fromIotaObjectData: (content: IotaObjectData) => CoinManagerMetadataCap.fromIotaObjectData( T0, content, ), fetch: async (client: IotaClient, id: string) => CoinManagerMetadataCap.fetch( client, T0, id, ), new: ( fields: CoinManagerMetadataCapFields<ToPhantomTypeArgument<T0>>, ) => { return new CoinManagerMetadataCap( [extractType(T0)], fields ) }, kind: "StructClassReified", } }

 static get r() { return CoinManagerMetadataCap.reified }

 static phantom<T0 extends PhantomReified<PhantomTypeArgument>>( T0: T0 ): PhantomReified<ToTypeStr<CoinManagerMetadataCap<ToPhantomTypeArgument<T0>>>> { return phantom(CoinManagerMetadataCap.reified( T0 )); } static get p() { return CoinManagerMetadataCap.phantom }

 static get bcs() { return bcs.struct("CoinManagerMetadataCap", {

 id: UID.bcs

}) };

 static fromFields<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, fields: Record<string, any> ): CoinManagerMetadataCap<ToPhantomTypeArgument<T0>> { return CoinManagerMetadataCap.reified( typeArg, ).new( { id: decodeFromFields(UID.reified(), fields.id) } ) }

 static fromFieldsWithTypes<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, item: FieldsWithTypes ): CoinManagerMetadataCap<ToPhantomTypeArgument<T0>> { if (!isCoinManagerMetadataCap(item.type)) { throw new Error("not a CoinManagerMetadataCap type");

 } assertFieldsWithTypesArgsMatch(item, [typeArg]);

 return CoinManagerMetadataCap.reified( typeArg, ).new( { id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id) } ) }

 static fromBcs<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, data: Uint8Array ): CoinManagerMetadataCap<ToPhantomTypeArgument<T0>> { return CoinManagerMetadataCap.fromFields( typeArg, CoinManagerMetadataCap.bcs.parse(data) ) }

 toJSONField() { return {

 id: this.id,

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, field: any ): CoinManagerMetadataCap<ToPhantomTypeArgument<T0>> { return CoinManagerMetadataCap.reified( typeArg, ).new( { id: decodeFromJSONField(UID.reified(), field.id) } ) }

 static fromJSON<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, json: Record<string, any> ): CoinManagerMetadataCap<ToPhantomTypeArgument<T0>> { if (json.$typeName !== CoinManagerMetadataCap.$typeName) { throw new Error("not a WithTwoGenerics json object") }; assertReifiedTypeArgsMatch( composeIotaType(CoinManagerMetadataCap.$typeName, extractType(typeArg)), json.$typeArgs, [typeArg], )

 return CoinManagerMetadataCap.fromJSONField( typeArg, json, ) }

 static fromIotaParsedData<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, content: IotaParsedData ): CoinManagerMetadataCap<ToPhantomTypeArgument<T0>> { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isCoinManagerMetadataCap(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a CoinManagerMetadataCap object`); } return CoinManagerMetadataCap.fromFieldsWithTypes( typeArg, content ); }

 static fromIotaObjectData<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, data: IotaObjectData ): CoinManagerMetadataCap<ToPhantomTypeArgument<T0>> { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isCoinManagerMetadataCap(data.bcs.type)) { throw new Error(`object at is not a CoinManagerMetadataCap object`); }

 const gotTypeArgs = parseTypeName(data.bcs.type).typeArgs; if (gotTypeArgs.length !== 1) { throw new Error(`type argument mismatch: expected 1 type argument but got '${gotTypeArgs.length}'`); }; const gotTypeArg = compressIotaType(gotTypeArgs[0]); const expectedTypeArg = compressIotaType(extractType(typeArg)); if (gotTypeArg !== compressIotaType(extractType(typeArg))) { throw new Error(`type argument mismatch: expected '${expectedTypeArg}' but got '${gotTypeArg}'`); };

 return CoinManagerMetadataCap.fromBcs( typeArg, fromB64(data.bcs.bcsBytes) ); } if (data.content) { return CoinManagerMetadataCap.fromIotaParsedData( typeArg, data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch<T0 extends PhantomReified<PhantomTypeArgument>>( client: IotaClient, typeArg: T0, id: string ): Promise<CoinManagerMetadataCap<ToPhantomTypeArgument<T0>>> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching CoinManagerMetadataCap object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isCoinManagerMetadataCap(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a CoinManagerMetadataCap object`); }

 return CoinManagerMetadataCap.fromIotaObjectData( typeArg, res.data ); }

 }

/* ============================== CoinManagerTreasuryCap =============================== */

export function isCoinManagerTreasuryCap(type: string): boolean { type = compressIotaType(type); return type.startsWith(`${PKG_V5}::coin_manager::CoinManagerTreasuryCap` + '<'); }

export interface CoinManagerTreasuryCapFields<T0 extends PhantomTypeArgument> { id: ToField<UID> }

export type CoinManagerTreasuryCapReified<T0 extends PhantomTypeArgument> = Reified< CoinManagerTreasuryCap<T0>, CoinManagerTreasuryCapFields<T0> >;

export class CoinManagerTreasuryCap<T0 extends PhantomTypeArgument> implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::coin_manager::CoinManagerTreasuryCap`; static readonly $numTypeParams = 1; static readonly $isPhantom = [true,] as const;

 readonly $typeName = CoinManagerTreasuryCap.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::coin_manager::CoinManagerTreasuryCap<${PhantomToTypeStr<T0>}>`; readonly $typeArgs: [PhantomToTypeStr<T0>]; readonly $isPhantom = CoinManagerTreasuryCap.$isPhantom;

 readonly id: ToField<UID>

 private constructor(typeArgs: [PhantomToTypeStr<T0>], fields: CoinManagerTreasuryCapFields<T0>, ) { this.$fullTypeName = composeIotaType( CoinManagerTreasuryCap.$typeName, ...typeArgs ) as `${typeof PKG_V5}::coin_manager::CoinManagerTreasuryCap<${PhantomToTypeStr<T0>}>`; this.$typeArgs = typeArgs;

 this.id = fields.id; }

 static reified<T0 extends PhantomReified<PhantomTypeArgument>>( T0: T0 ): CoinManagerTreasuryCapReified<ToPhantomTypeArgument<T0>> { return { typeName: CoinManagerTreasuryCap.$typeName, fullTypeName: composeIotaType( CoinManagerTreasuryCap.$typeName, ...[extractType(T0)] ) as `${typeof PKG_V5}::coin_manager::CoinManagerTreasuryCap<${PhantomToTypeStr<ToPhantomTypeArgument<T0>>}>`, typeArgs: [ extractType(T0) ] as [PhantomToTypeStr<ToPhantomTypeArgument<T0>>], isPhantom: CoinManagerTreasuryCap.$isPhantom, reifiedTypeArgs: [T0], fromFields: (fields: Record<string, any>) => CoinManagerTreasuryCap.fromFields( T0, fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => CoinManagerTreasuryCap.fromFieldsWithTypes( T0, item, ), fromBcs: (data: Uint8Array) => CoinManagerTreasuryCap.fromBcs( T0, data, ), bcs: CoinManagerTreasuryCap.bcs, fromJSONField: (field: any) => CoinManagerTreasuryCap.fromJSONField( T0, field, ), fromJSON: (json: Record<string, any>) => CoinManagerTreasuryCap.fromJSON( T0, json, ), fromIotaParsedData: (content: IotaParsedData) => CoinManagerTreasuryCap.fromIotaParsedData( T0, content, ), fromIotaObjectData: (content: IotaObjectData) => CoinManagerTreasuryCap.fromIotaObjectData( T0, content, ), fetch: async (client: IotaClient, id: string) => CoinManagerTreasuryCap.fetch( client, T0, id, ), new: ( fields: CoinManagerTreasuryCapFields<ToPhantomTypeArgument<T0>>, ) => { return new CoinManagerTreasuryCap( [extractType(T0)], fields ) }, kind: "StructClassReified", } }

 static get r() { return CoinManagerTreasuryCap.reified }

 static phantom<T0 extends PhantomReified<PhantomTypeArgument>>( T0: T0 ): PhantomReified<ToTypeStr<CoinManagerTreasuryCap<ToPhantomTypeArgument<T0>>>> { return phantom(CoinManagerTreasuryCap.reified( T0 )); } static get p() { return CoinManagerTreasuryCap.phantom }

 static get bcs() { return bcs.struct("CoinManagerTreasuryCap", {

 id: UID.bcs

}) };

 static fromFields<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, fields: Record<string, any> ): CoinManagerTreasuryCap<ToPhantomTypeArgument<T0>> { return CoinManagerTreasuryCap.reified( typeArg, ).new( { id: decodeFromFields(UID.reified(), fields.id) } ) }

 static fromFieldsWithTypes<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, item: FieldsWithTypes ): CoinManagerTreasuryCap<ToPhantomTypeArgument<T0>> { if (!isCoinManagerTreasuryCap(item.type)) { throw new Error("not a CoinManagerTreasuryCap type");

 } assertFieldsWithTypesArgsMatch(item, [typeArg]);

 return CoinManagerTreasuryCap.reified( typeArg, ).new( { id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id) } ) }

 static fromBcs<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, data: Uint8Array ): CoinManagerTreasuryCap<ToPhantomTypeArgument<T0>> { return CoinManagerTreasuryCap.fromFields( typeArg, CoinManagerTreasuryCap.bcs.parse(data) ) }

 toJSONField() { return {

 id: this.id,

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, field: any ): CoinManagerTreasuryCap<ToPhantomTypeArgument<T0>> { return CoinManagerTreasuryCap.reified( typeArg, ).new( { id: decodeFromJSONField(UID.reified(), field.id) } ) }

 static fromJSON<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, json: Record<string, any> ): CoinManagerTreasuryCap<ToPhantomTypeArgument<T0>> { if (json.$typeName !== CoinManagerTreasuryCap.$typeName) { throw new Error("not a WithTwoGenerics json object") }; assertReifiedTypeArgsMatch( composeIotaType(CoinManagerTreasuryCap.$typeName, extractType(typeArg)), json.$typeArgs, [typeArg], )

 return CoinManagerTreasuryCap.fromJSONField( typeArg, json, ) }

 static fromIotaParsedData<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, content: IotaParsedData ): CoinManagerTreasuryCap<ToPhantomTypeArgument<T0>> { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isCoinManagerTreasuryCap(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a CoinManagerTreasuryCap object`); } return CoinManagerTreasuryCap.fromFieldsWithTypes( typeArg, content ); }

 static fromIotaObjectData<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, data: IotaObjectData ): CoinManagerTreasuryCap<ToPhantomTypeArgument<T0>> { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isCoinManagerTreasuryCap(data.bcs.type)) { throw new Error(`object at is not a CoinManagerTreasuryCap object`); }

 const gotTypeArgs = parseTypeName(data.bcs.type).typeArgs; if (gotTypeArgs.length !== 1) { throw new Error(`type argument mismatch: expected 1 type argument but got '${gotTypeArgs.length}'`); }; const gotTypeArg = compressIotaType(gotTypeArgs[0]); const expectedTypeArg = compressIotaType(extractType(typeArg)); if (gotTypeArg !== compressIotaType(extractType(typeArg))) { throw new Error(`type argument mismatch: expected '${expectedTypeArg}' but got '${gotTypeArg}'`); };

 return CoinManagerTreasuryCap.fromBcs( typeArg, fromB64(data.bcs.bcsBytes) ); } if (data.content) { return CoinManagerTreasuryCap.fromIotaParsedData( typeArg, data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch<T0 extends PhantomReified<PhantomTypeArgument>>( client: IotaClient, typeArg: T0, id: string ): Promise<CoinManagerTreasuryCap<ToPhantomTypeArgument<T0>>> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching CoinManagerTreasuryCap object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isCoinManagerTreasuryCap(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a CoinManagerTreasuryCap object`); }

 return CoinManagerTreasuryCap.fromIotaObjectData( typeArg, res.data ); }

 }

/* ============================== ImmutableCoinMetadata =============================== */

export function isImmutableCoinMetadata(type: string): boolean { type = compressIotaType(type); return type.startsWith(`${PKG_V5}::coin_manager::ImmutableCoinMetadata` + '<'); }

export interface ImmutableCoinMetadataFields<T0 extends PhantomTypeArgument> { decimals: ToField<"u8">; name: ToField<String1>; symbol: ToField<String>; description: ToField<String1>; iconUrl: ToField<Option<Url>> }

export type ImmutableCoinMetadataReified<T0 extends PhantomTypeArgument> = Reified< ImmutableCoinMetadata<T0>, ImmutableCoinMetadataFields<T0> >;

export class ImmutableCoinMetadata<T0 extends PhantomTypeArgument> implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::coin_manager::ImmutableCoinMetadata`; static readonly $numTypeParams = 1; static readonly $isPhantom = [true,] as const;

 readonly $typeName = ImmutableCoinMetadata.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::coin_manager::ImmutableCoinMetadata<${PhantomToTypeStr<T0>}>`; readonly $typeArgs: [PhantomToTypeStr<T0>]; readonly $isPhantom = ImmutableCoinMetadata.$isPhantom;

 readonly decimals: ToField<"u8">; readonly name: ToField<String1>; readonly symbol: ToField<String>; readonly description: ToField<String1>; readonly iconUrl: ToField<Option<Url>>

 private constructor(typeArgs: [PhantomToTypeStr<T0>], fields: ImmutableCoinMetadataFields<T0>, ) { this.$fullTypeName = composeIotaType( ImmutableCoinMetadata.$typeName, ...typeArgs ) as `${typeof PKG_V5}::coin_manager::ImmutableCoinMetadata<${PhantomToTypeStr<T0>}>`; this.$typeArgs = typeArgs;

 this.decimals = fields.decimals;; this.name = fields.name;; this.symbol = fields.symbol;; this.description = fields.description;; this.iconUrl = fields.iconUrl; }

 static reified<T0 extends PhantomReified<PhantomTypeArgument>>( T0: T0 ): ImmutableCoinMetadataReified<ToPhantomTypeArgument<T0>> { return { typeName: ImmutableCoinMetadata.$typeName, fullTypeName: composeIotaType( ImmutableCoinMetadata.$typeName, ...[extractType(T0)] ) as `${typeof PKG_V5}::coin_manager::ImmutableCoinMetadata<${PhantomToTypeStr<ToPhantomTypeArgument<T0>>}>`, typeArgs: [ extractType(T0) ] as [PhantomToTypeStr<ToPhantomTypeArgument<T0>>], isPhantom: ImmutableCoinMetadata.$isPhantom, reifiedTypeArgs: [T0], fromFields: (fields: Record<string, any>) => ImmutableCoinMetadata.fromFields( T0, fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => ImmutableCoinMetadata.fromFieldsWithTypes( T0, item, ), fromBcs: (data: Uint8Array) => ImmutableCoinMetadata.fromBcs( T0, data, ), bcs: ImmutableCoinMetadata.bcs, fromJSONField: (field: any) => ImmutableCoinMetadata.fromJSONField( T0, field, ), fromJSON: (json: Record<string, any>) => ImmutableCoinMetadata.fromJSON( T0, json, ), fromIotaParsedData: (content: IotaParsedData) => ImmutableCoinMetadata.fromIotaParsedData( T0, content, ), fromIotaObjectData: (content: IotaObjectData) => ImmutableCoinMetadata.fromIotaObjectData( T0, content, ), fetch: async (client: IotaClient, id: string) => ImmutableCoinMetadata.fetch( client, T0, id, ), new: ( fields: ImmutableCoinMetadataFields<ToPhantomTypeArgument<T0>>, ) => { return new ImmutableCoinMetadata( [extractType(T0)], fields ) }, kind: "StructClassReified", } }

 static get r() { return ImmutableCoinMetadata.reified }

 static phantom<T0 extends PhantomReified<PhantomTypeArgument>>( T0: T0 ): PhantomReified<ToTypeStr<ImmutableCoinMetadata<ToPhantomTypeArgument<T0>>>> { return phantom(ImmutableCoinMetadata.reified( T0 )); } static get p() { return ImmutableCoinMetadata.phantom }

 static get bcs() { return bcs.struct("ImmutableCoinMetadata", {

 decimals: bcs.u8(), name: String1.bcs, symbol: String.bcs, description: String1.bcs, icon_url: Option.bcs(Url.bcs)

}) };

 static fromFields<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, fields: Record<string, any> ): ImmutableCoinMetadata<ToPhantomTypeArgument<T0>> { return ImmutableCoinMetadata.reified( typeArg, ).new( { decimals: decodeFromFields("u8", fields.decimals), name: decodeFromFields(String1.reified(), fields.name), symbol: decodeFromFields(String.reified(), fields.symbol), description: decodeFromFields(String1.reified(), fields.description), iconUrl: decodeFromFields(Option.reified(Url.reified()), fields.icon_url) } ) }

 static fromFieldsWithTypes<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, item: FieldsWithTypes ): ImmutableCoinMetadata<ToPhantomTypeArgument<T0>> { if (!isImmutableCoinMetadata(item.type)) { throw new Error("not a ImmutableCoinMetadata type");

 } assertFieldsWithTypesArgsMatch(item, [typeArg]);

 return ImmutableCoinMetadata.reified( typeArg, ).new( { decimals: decodeFromFieldsWithTypes("u8", item.fields.decimals), name: decodeFromFieldsWithTypes(String1.reified(), item.fields.name), symbol: decodeFromFieldsWithTypes(String.reified(), item.fields.symbol), description: decodeFromFieldsWithTypes(String1.reified(), item.fields.description), iconUrl: decodeFromFieldsWithTypes(Option.reified(Url.reified()), item.fields.icon_url) } ) }

 static fromBcs<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, data: Uint8Array ): ImmutableCoinMetadata<ToPhantomTypeArgument<T0>> { return ImmutableCoinMetadata.fromFields( typeArg, ImmutableCoinMetadata.bcs.parse(data) ) }

 toJSONField() { return {

 decimals: this.decimals,name: this.name,symbol: this.symbol,description: this.description,iconUrl: this.iconUrl.toJSONField(),

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, field: any ): ImmutableCoinMetadata<ToPhantomTypeArgument<T0>> { return ImmutableCoinMetadata.reified( typeArg, ).new( { decimals: decodeFromJSONField("u8", field.decimals), name: decodeFromJSONField(String1.reified(), field.name), symbol: decodeFromJSONField(String.reified(), field.symbol), description: decodeFromJSONField(String1.reified(), field.description), iconUrl: decodeFromJSONField(Option.reified(Url.reified()), field.iconUrl) } ) }

 static fromJSON<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, json: Record<string, any> ): ImmutableCoinMetadata<ToPhantomTypeArgument<T0>> { if (json.$typeName !== ImmutableCoinMetadata.$typeName) { throw new Error("not a WithTwoGenerics json object") }; assertReifiedTypeArgsMatch( composeIotaType(ImmutableCoinMetadata.$typeName, extractType(typeArg)), json.$typeArgs, [typeArg], )

 return ImmutableCoinMetadata.fromJSONField( typeArg, json, ) }

 static fromIotaParsedData<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, content: IotaParsedData ): ImmutableCoinMetadata<ToPhantomTypeArgument<T0>> { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isImmutableCoinMetadata(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a ImmutableCoinMetadata object`); } return ImmutableCoinMetadata.fromFieldsWithTypes( typeArg, content ); }

 static fromIotaObjectData<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, data: IotaObjectData ): ImmutableCoinMetadata<ToPhantomTypeArgument<T0>> { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isImmutableCoinMetadata(data.bcs.type)) { throw new Error(`object at is not a ImmutableCoinMetadata object`); }

 const gotTypeArgs = parseTypeName(data.bcs.type).typeArgs; if (gotTypeArgs.length !== 1) { throw new Error(`type argument mismatch: expected 1 type argument but got '${gotTypeArgs.length}'`); }; const gotTypeArg = compressIotaType(gotTypeArgs[0]); const expectedTypeArg = compressIotaType(extractType(typeArg)); if (gotTypeArg !== compressIotaType(extractType(typeArg))) { throw new Error(`type argument mismatch: expected '${expectedTypeArg}' but got '${gotTypeArg}'`); };

 return ImmutableCoinMetadata.fromBcs( typeArg, fromB64(data.bcs.bcsBytes) ); } if (data.content) { return ImmutableCoinMetadata.fromIotaParsedData( typeArg, data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch<T0 extends PhantomReified<PhantomTypeArgument>>( client: IotaClient, typeArg: T0, id: string ): Promise<ImmutableCoinMetadata<ToPhantomTypeArgument<T0>>> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching ImmutableCoinMetadata object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isImmutableCoinMetadata(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a ImmutableCoinMetadata object`); }

 return ImmutableCoinMetadata.fromIotaObjectData( typeArg, res.data ); }

 }

/* ============================== MetadataOwnershipRenounced =============================== */

export function isMetadataOwnershipRenounced(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V5}::coin_manager::MetadataOwnershipRenounced`; }

export interface MetadataOwnershipRenouncedFields { coinName: ToField<String> }

export type MetadataOwnershipRenouncedReified = Reified< MetadataOwnershipRenounced, MetadataOwnershipRenouncedFields >;

export class MetadataOwnershipRenounced implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::coin_manager::MetadataOwnershipRenounced`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = MetadataOwnershipRenounced.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::coin_manager::MetadataOwnershipRenounced`; readonly $typeArgs: []; readonly $isPhantom = MetadataOwnershipRenounced.$isPhantom;

 readonly coinName: ToField<String>

 private constructor(typeArgs: [], fields: MetadataOwnershipRenouncedFields, ) { this.$fullTypeName = composeIotaType( MetadataOwnershipRenounced.$typeName, ...typeArgs ) as `${typeof PKG_V5}::coin_manager::MetadataOwnershipRenounced`; this.$typeArgs = typeArgs;

 this.coinName = fields.coinName; }

 static reified( ): MetadataOwnershipRenouncedReified { return { typeName: MetadataOwnershipRenounced.$typeName, fullTypeName: composeIotaType( MetadataOwnershipRenounced.$typeName, ...[] ) as `${typeof PKG_V5}::coin_manager::MetadataOwnershipRenounced`, typeArgs: [ ] as [], isPhantom: MetadataOwnershipRenounced.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => MetadataOwnershipRenounced.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => MetadataOwnershipRenounced.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => MetadataOwnershipRenounced.fromBcs( data, ), bcs: MetadataOwnershipRenounced.bcs, fromJSONField: (field: any) => MetadataOwnershipRenounced.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => MetadataOwnershipRenounced.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => MetadataOwnershipRenounced.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => MetadataOwnershipRenounced.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => MetadataOwnershipRenounced.fetch( client, id, ), new: ( fields: MetadataOwnershipRenouncedFields, ) => { return new MetadataOwnershipRenounced( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return MetadataOwnershipRenounced.reified() }

 static phantom( ): PhantomReified<ToTypeStr<MetadataOwnershipRenounced>> { return phantom(MetadataOwnershipRenounced.reified( )); } static get p() { return MetadataOwnershipRenounced.phantom() }

 static get bcs() { return bcs.struct("MetadataOwnershipRenounced", {

 coin_name: String.bcs

}) };

 static fromFields( fields: Record<string, any> ): MetadataOwnershipRenounced { return MetadataOwnershipRenounced.reified( ).new( { coinName: decodeFromFields(String.reified(), fields.coin_name) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): MetadataOwnershipRenounced { if (!isMetadataOwnershipRenounced(item.type)) { throw new Error("not a MetadataOwnershipRenounced type");

 }

 return MetadataOwnershipRenounced.reified( ).new( { coinName: decodeFromFieldsWithTypes(String.reified(), item.fields.coin_name) } ) }

 static fromBcs( data: Uint8Array ): MetadataOwnershipRenounced { return MetadataOwnershipRenounced.fromFields( MetadataOwnershipRenounced.bcs.parse(data) ) }

 toJSONField() { return {

 coinName: this.coinName,

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): MetadataOwnershipRenounced { return MetadataOwnershipRenounced.reified( ).new( { coinName: decodeFromJSONField(String.reified(), field.coinName) } ) }

 static fromJSON( json: Record<string, any> ): MetadataOwnershipRenounced { if (json.$typeName !== MetadataOwnershipRenounced.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return MetadataOwnershipRenounced.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): MetadataOwnershipRenounced { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isMetadataOwnershipRenounced(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a MetadataOwnershipRenounced object`); } return MetadataOwnershipRenounced.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): MetadataOwnershipRenounced { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isMetadataOwnershipRenounced(data.bcs.type)) { throw new Error(`object at is not a MetadataOwnershipRenounced object`); }

 return MetadataOwnershipRenounced.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return MetadataOwnershipRenounced.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<MetadataOwnershipRenounced> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching MetadataOwnershipRenounced object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isMetadataOwnershipRenounced(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a MetadataOwnershipRenounced object`); }

 return MetadataOwnershipRenounced.fromIotaObjectData( res.data ); }

 }

/* ============================== TreasuryOwnershipRenounced =============================== */

export function isTreasuryOwnershipRenounced(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V5}::coin_manager::TreasuryOwnershipRenounced`; }

export interface TreasuryOwnershipRenouncedFields { coinName: ToField<String> }

export type TreasuryOwnershipRenouncedReified = Reified< TreasuryOwnershipRenounced, TreasuryOwnershipRenouncedFields >;

export class TreasuryOwnershipRenounced implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::coin_manager::TreasuryOwnershipRenounced`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = TreasuryOwnershipRenounced.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::coin_manager::TreasuryOwnershipRenounced`; readonly $typeArgs: []; readonly $isPhantom = TreasuryOwnershipRenounced.$isPhantom;

 readonly coinName: ToField<String>

 private constructor(typeArgs: [], fields: TreasuryOwnershipRenouncedFields, ) { this.$fullTypeName = composeIotaType( TreasuryOwnershipRenounced.$typeName, ...typeArgs ) as `${typeof PKG_V5}::coin_manager::TreasuryOwnershipRenounced`; this.$typeArgs = typeArgs;

 this.coinName = fields.coinName; }

 static reified( ): TreasuryOwnershipRenouncedReified { return { typeName: TreasuryOwnershipRenounced.$typeName, fullTypeName: composeIotaType( TreasuryOwnershipRenounced.$typeName, ...[] ) as `${typeof PKG_V5}::coin_manager::TreasuryOwnershipRenounced`, typeArgs: [ ] as [], isPhantom: TreasuryOwnershipRenounced.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => TreasuryOwnershipRenounced.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => TreasuryOwnershipRenounced.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => TreasuryOwnershipRenounced.fromBcs( data, ), bcs: TreasuryOwnershipRenounced.bcs, fromJSONField: (field: any) => TreasuryOwnershipRenounced.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => TreasuryOwnershipRenounced.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => TreasuryOwnershipRenounced.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => TreasuryOwnershipRenounced.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => TreasuryOwnershipRenounced.fetch( client, id, ), new: ( fields: TreasuryOwnershipRenouncedFields, ) => { return new TreasuryOwnershipRenounced( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return TreasuryOwnershipRenounced.reified() }

 static phantom( ): PhantomReified<ToTypeStr<TreasuryOwnershipRenounced>> { return phantom(TreasuryOwnershipRenounced.reified( )); } static get p() { return TreasuryOwnershipRenounced.phantom() }

 static get bcs() { return bcs.struct("TreasuryOwnershipRenounced", {

 coin_name: String.bcs

}) };

 static fromFields( fields: Record<string, any> ): TreasuryOwnershipRenounced { return TreasuryOwnershipRenounced.reified( ).new( { coinName: decodeFromFields(String.reified(), fields.coin_name) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): TreasuryOwnershipRenounced { if (!isTreasuryOwnershipRenounced(item.type)) { throw new Error("not a TreasuryOwnershipRenounced type");

 }

 return TreasuryOwnershipRenounced.reified( ).new( { coinName: decodeFromFieldsWithTypes(String.reified(), item.fields.coin_name) } ) }

 static fromBcs( data: Uint8Array ): TreasuryOwnershipRenounced { return TreasuryOwnershipRenounced.fromFields( TreasuryOwnershipRenounced.bcs.parse(data) ) }

 toJSONField() { return {

 coinName: this.coinName,

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): TreasuryOwnershipRenounced { return TreasuryOwnershipRenounced.reified( ).new( { coinName: decodeFromJSONField(String.reified(), field.coinName) } ) }

 static fromJSON( json: Record<string, any> ): TreasuryOwnershipRenounced { if (json.$typeName !== TreasuryOwnershipRenounced.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return TreasuryOwnershipRenounced.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): TreasuryOwnershipRenounced { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isTreasuryOwnershipRenounced(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a TreasuryOwnershipRenounced object`); } return TreasuryOwnershipRenounced.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): TreasuryOwnershipRenounced { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isTreasuryOwnershipRenounced(data.bcs.type)) { throw new Error(`object at is not a TreasuryOwnershipRenounced object`); }

 return TreasuryOwnershipRenounced.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return TreasuryOwnershipRenounced.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<TreasuryOwnershipRenounced> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching TreasuryOwnershipRenounced object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isTreasuryOwnershipRenounced(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a TreasuryOwnershipRenounced object`); }

 return TreasuryOwnershipRenounced.fromIotaObjectData( res.data ); }

 }
