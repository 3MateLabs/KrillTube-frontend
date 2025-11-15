// @ts-nocheck
import * as reified from "../../../../_framework/reified";
import {PhantomReified, Reified, StructClass, ToField, ToTypeStr, decodeFromFields, decodeFromFieldsWithTypes, decodeFromJSONField, fieldToJSON, phantom} from "../../../../_framework/reified";
import {FieldsWithTypes, composeIotaType, compressIotaType} from "../../../../_framework/util";
import {Vector} from "../../../../_framework/vector";
import {Bag} from "../bag/structs";
import {PKG_V5} from "../index";
import {ID, UID} from "../object/structs";
import {bcs} from "@iota/iota-sdk/bcs";
import {IotaClient, IotaObjectData, IotaParsedData} from "@iota/iota-sdk/client";
import {fromB64, fromHEX, toHEX} from "@iota/iota-sdk/utils";

/* ============================== AddressKey =============================== */

export function isAddressKey(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V5}::deny_list::AddressKey`; }

export interface AddressKeyFields { pos0: ToField<"address"> }

export type AddressKeyReified = Reified< AddressKey, AddressKeyFields >;

export class AddressKey implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::deny_list::AddressKey`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = AddressKey.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::deny_list::AddressKey`; readonly $typeArgs: []; readonly $isPhantom = AddressKey.$isPhantom;

 readonly pos0: ToField<"address">

 private constructor(typeArgs: [], fields: AddressKeyFields, ) { this.$fullTypeName = composeIotaType( AddressKey.$typeName, ...typeArgs ) as `${typeof PKG_V5}::deny_list::AddressKey`; this.$typeArgs = typeArgs;

 this.pos0 = fields.pos0; }

 static reified( ): AddressKeyReified { return { typeName: AddressKey.$typeName, fullTypeName: composeIotaType( AddressKey.$typeName, ...[] ) as `${typeof PKG_V5}::deny_list::AddressKey`, typeArgs: [ ] as [], isPhantom: AddressKey.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => AddressKey.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => AddressKey.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => AddressKey.fromBcs( data, ), bcs: AddressKey.bcs, fromJSONField: (field: any) => AddressKey.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => AddressKey.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => AddressKey.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => AddressKey.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => AddressKey.fetch( client, id, ), new: ( fields: AddressKeyFields, ) => { return new AddressKey( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return AddressKey.reified() }

 static phantom( ): PhantomReified<ToTypeStr<AddressKey>> { return phantom(AddressKey.reified( )); } static get p() { return AddressKey.phantom() }

 static get bcs() { return bcs.struct("AddressKey", {

 pos0: bcs.bytes(32).transform({ input: (val: string) => fromHEX(val), output: (val: Uint8Array) => toHEX(val), })

}) };

 static fromFields( fields: Record<string, any> ): AddressKey { return AddressKey.reified( ).new( { pos0: decodeFromFields("address", fields.pos0) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): AddressKey { if (!isAddressKey(item.type)) { throw new Error("not a AddressKey type");

 }

 return AddressKey.reified( ).new( { pos0: decodeFromFieldsWithTypes("address", item.fields.pos0) } ) }

 static fromBcs( data: Uint8Array ): AddressKey { return AddressKey.fromFields( AddressKey.bcs.parse(data) ) }

 toJSONField() { return {

 pos0: this.pos0,

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): AddressKey { return AddressKey.reified( ).new( { pos0: decodeFromJSONField("address", field.pos0) } ) }

 static fromJSON( json: Record<string, any> ): AddressKey { if (json.$typeName !== AddressKey.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return AddressKey.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): AddressKey { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isAddressKey(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a AddressKey object`); } return AddressKey.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): AddressKey { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isAddressKey(data.bcs.type)) { throw new Error(`object at is not a AddressKey object`); }

 return AddressKey.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return AddressKey.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<AddressKey> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching AddressKey object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isAddressKey(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a AddressKey object`); }

 return AddressKey.fromIotaObjectData( res.data ); }

 }

/* ============================== ConfigKey =============================== */

export function isConfigKey(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V5}::deny_list::ConfigKey`; }

export interface ConfigKeyFields { perTypeIndex: ToField<"u64">; perTypeKey: ToField<Vector<"u8">> }

export type ConfigKeyReified = Reified< ConfigKey, ConfigKeyFields >;

export class ConfigKey implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::deny_list::ConfigKey`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = ConfigKey.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::deny_list::ConfigKey`; readonly $typeArgs: []; readonly $isPhantom = ConfigKey.$isPhantom;

 readonly perTypeIndex: ToField<"u64">; readonly perTypeKey: ToField<Vector<"u8">>

 private constructor(typeArgs: [], fields: ConfigKeyFields, ) { this.$fullTypeName = composeIotaType( ConfigKey.$typeName, ...typeArgs ) as `${typeof PKG_V5}::deny_list::ConfigKey`; this.$typeArgs = typeArgs;

 this.perTypeIndex = fields.perTypeIndex;; this.perTypeKey = fields.perTypeKey; }

 static reified( ): ConfigKeyReified { return { typeName: ConfigKey.$typeName, fullTypeName: composeIotaType( ConfigKey.$typeName, ...[] ) as `${typeof PKG_V5}::deny_list::ConfigKey`, typeArgs: [ ] as [], isPhantom: ConfigKey.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => ConfigKey.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => ConfigKey.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => ConfigKey.fromBcs( data, ), bcs: ConfigKey.bcs, fromJSONField: (field: any) => ConfigKey.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => ConfigKey.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => ConfigKey.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => ConfigKey.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => ConfigKey.fetch( client, id, ), new: ( fields: ConfigKeyFields, ) => { return new ConfigKey( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return ConfigKey.reified() }

 static phantom( ): PhantomReified<ToTypeStr<ConfigKey>> { return phantom(ConfigKey.reified( )); } static get p() { return ConfigKey.phantom() }

 static get bcs() { return bcs.struct("ConfigKey", {

 per_type_index: bcs.u64(), per_type_key: bcs.vector(bcs.u8())

}) };

 static fromFields( fields: Record<string, any> ): ConfigKey { return ConfigKey.reified( ).new( { perTypeIndex: decodeFromFields("u64", fields.per_type_index), perTypeKey: decodeFromFields(reified.vector("u8"), fields.per_type_key) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): ConfigKey { if (!isConfigKey(item.type)) { throw new Error("not a ConfigKey type");

 }

 return ConfigKey.reified( ).new( { perTypeIndex: decodeFromFieldsWithTypes("u64", item.fields.per_type_index), perTypeKey: decodeFromFieldsWithTypes(reified.vector("u8"), item.fields.per_type_key) } ) }

 static fromBcs( data: Uint8Array ): ConfigKey { return ConfigKey.fromFields( ConfigKey.bcs.parse(data) ) }

 toJSONField() { return {

 perTypeIndex: this.perTypeIndex.toString(),perTypeKey: fieldToJSON<Vector<"u8">>(`vector<u8>`, this.perTypeKey),

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): ConfigKey { return ConfigKey.reified( ).new( { perTypeIndex: decodeFromJSONField("u64", field.perTypeIndex), perTypeKey: decodeFromJSONField(reified.vector("u8"), field.perTypeKey) } ) }

 static fromJSON( json: Record<string, any> ): ConfigKey { if (json.$typeName !== ConfigKey.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return ConfigKey.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): ConfigKey { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isConfigKey(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a ConfigKey object`); } return ConfigKey.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): ConfigKey { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isConfigKey(data.bcs.type)) { throw new Error(`object at is not a ConfigKey object`); }

 return ConfigKey.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return ConfigKey.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<ConfigKey> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching ConfigKey object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isConfigKey(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a ConfigKey object`); }

 return ConfigKey.fromIotaObjectData( res.data ); }

 }

/* ============================== ConfigWriteCap =============================== */

export function isConfigWriteCap(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V5}::deny_list::ConfigWriteCap`; }

export interface ConfigWriteCapFields { dummyField: ToField<"bool"> }

export type ConfigWriteCapReified = Reified< ConfigWriteCap, ConfigWriteCapFields >;

export class ConfigWriteCap implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::deny_list::ConfigWriteCap`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = ConfigWriteCap.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::deny_list::ConfigWriteCap`; readonly $typeArgs: []; readonly $isPhantom = ConfigWriteCap.$isPhantom;

 readonly dummyField: ToField<"bool">

 private constructor(typeArgs: [], fields: ConfigWriteCapFields, ) { this.$fullTypeName = composeIotaType( ConfigWriteCap.$typeName, ...typeArgs ) as `${typeof PKG_V5}::deny_list::ConfigWriteCap`; this.$typeArgs = typeArgs;

 this.dummyField = fields.dummyField; }

 static reified( ): ConfigWriteCapReified { return { typeName: ConfigWriteCap.$typeName, fullTypeName: composeIotaType( ConfigWriteCap.$typeName, ...[] ) as `${typeof PKG_V5}::deny_list::ConfigWriteCap`, typeArgs: [ ] as [], isPhantom: ConfigWriteCap.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => ConfigWriteCap.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => ConfigWriteCap.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => ConfigWriteCap.fromBcs( data, ), bcs: ConfigWriteCap.bcs, fromJSONField: (field: any) => ConfigWriteCap.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => ConfigWriteCap.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => ConfigWriteCap.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => ConfigWriteCap.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => ConfigWriteCap.fetch( client, id, ), new: ( fields: ConfigWriteCapFields, ) => { return new ConfigWriteCap( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return ConfigWriteCap.reified() }

 static phantom( ): PhantomReified<ToTypeStr<ConfigWriteCap>> { return phantom(ConfigWriteCap.reified( )); } static get p() { return ConfigWriteCap.phantom() }

 static get bcs() { return bcs.struct("ConfigWriteCap", {

 dummy_field: bcs.bool()

}) };

 static fromFields( fields: Record<string, any> ): ConfigWriteCap { return ConfigWriteCap.reified( ).new( { dummyField: decodeFromFields("bool", fields.dummy_field) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): ConfigWriteCap { if (!isConfigWriteCap(item.type)) { throw new Error("not a ConfigWriteCap type");

 }

 return ConfigWriteCap.reified( ).new( { dummyField: decodeFromFieldsWithTypes("bool", item.fields.dummy_field) } ) }

 static fromBcs( data: Uint8Array ): ConfigWriteCap { return ConfigWriteCap.fromFields( ConfigWriteCap.bcs.parse(data) ) }

 toJSONField() { return {

 dummyField: this.dummyField,

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): ConfigWriteCap { return ConfigWriteCap.reified( ).new( { dummyField: decodeFromJSONField("bool", field.dummyField) } ) }

 static fromJSON( json: Record<string, any> ): ConfigWriteCap { if (json.$typeName !== ConfigWriteCap.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return ConfigWriteCap.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): ConfigWriteCap { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isConfigWriteCap(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a ConfigWriteCap object`); } return ConfigWriteCap.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): ConfigWriteCap { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isConfigWriteCap(data.bcs.type)) { throw new Error(`object at is not a ConfigWriteCap object`); }

 return ConfigWriteCap.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return ConfigWriteCap.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<ConfigWriteCap> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching ConfigWriteCap object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isConfigWriteCap(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a ConfigWriteCap object`); }

 return ConfigWriteCap.fromIotaObjectData( res.data ); }

 }

/* ============================== DenyList =============================== */

export function isDenyList(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V5}::deny_list::DenyList`; }

export interface DenyListFields { id: ToField<UID>; lists: ToField<Bag> }

export type DenyListReified = Reified< DenyList, DenyListFields >;

export class DenyList implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::deny_list::DenyList`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = DenyList.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::deny_list::DenyList`; readonly $typeArgs: []; readonly $isPhantom = DenyList.$isPhantom;

 readonly id: ToField<UID>; readonly lists: ToField<Bag>

 private constructor(typeArgs: [], fields: DenyListFields, ) { this.$fullTypeName = composeIotaType( DenyList.$typeName, ...typeArgs ) as `${typeof PKG_V5}::deny_list::DenyList`; this.$typeArgs = typeArgs;

 this.id = fields.id;; this.lists = fields.lists; }

 static reified( ): DenyListReified { return { typeName: DenyList.$typeName, fullTypeName: composeIotaType( DenyList.$typeName, ...[] ) as `${typeof PKG_V5}::deny_list::DenyList`, typeArgs: [ ] as [], isPhantom: DenyList.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => DenyList.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => DenyList.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => DenyList.fromBcs( data, ), bcs: DenyList.bcs, fromJSONField: (field: any) => DenyList.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => DenyList.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => DenyList.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => DenyList.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => DenyList.fetch( client, id, ), new: ( fields: DenyListFields, ) => { return new DenyList( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return DenyList.reified() }

 static phantom( ): PhantomReified<ToTypeStr<DenyList>> { return phantom(DenyList.reified( )); } static get p() { return DenyList.phantom() }

 static get bcs() { return bcs.struct("DenyList", {

 id: UID.bcs, lists: Bag.bcs

}) };

 static fromFields( fields: Record<string, any> ): DenyList { return DenyList.reified( ).new( { id: decodeFromFields(UID.reified(), fields.id), lists: decodeFromFields(Bag.reified(), fields.lists) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): DenyList { if (!isDenyList(item.type)) { throw new Error("not a DenyList type");

 }

 return DenyList.reified( ).new( { id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id), lists: decodeFromFieldsWithTypes(Bag.reified(), item.fields.lists) } ) }

 static fromBcs( data: Uint8Array ): DenyList { return DenyList.fromFields( DenyList.bcs.parse(data) ) }

 toJSONField() { return {

 id: this.id,lists: this.lists.toJSONField(),

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): DenyList { return DenyList.reified( ).new( { id: decodeFromJSONField(UID.reified(), field.id), lists: decodeFromJSONField(Bag.reified(), field.lists) } ) }

 static fromJSON( json: Record<string, any> ): DenyList { if (json.$typeName !== DenyList.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return DenyList.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): DenyList { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isDenyList(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a DenyList object`); } return DenyList.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): DenyList { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isDenyList(data.bcs.type)) { throw new Error(`object at is not a DenyList object`); }

 return DenyList.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return DenyList.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<DenyList> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching DenyList object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isDenyList(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a DenyList object`); }

 return DenyList.fromIotaObjectData( res.data ); }

 }

/* ============================== GlobalPauseKey =============================== */

export function isGlobalPauseKey(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V5}::deny_list::GlobalPauseKey`; }

export interface GlobalPauseKeyFields { dummyField: ToField<"bool"> }

export type GlobalPauseKeyReified = Reified< GlobalPauseKey, GlobalPauseKeyFields >;

export class GlobalPauseKey implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::deny_list::GlobalPauseKey`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = GlobalPauseKey.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::deny_list::GlobalPauseKey`; readonly $typeArgs: []; readonly $isPhantom = GlobalPauseKey.$isPhantom;

 readonly dummyField: ToField<"bool">

 private constructor(typeArgs: [], fields: GlobalPauseKeyFields, ) { this.$fullTypeName = composeIotaType( GlobalPauseKey.$typeName, ...typeArgs ) as `${typeof PKG_V5}::deny_list::GlobalPauseKey`; this.$typeArgs = typeArgs;

 this.dummyField = fields.dummyField; }

 static reified( ): GlobalPauseKeyReified { return { typeName: GlobalPauseKey.$typeName, fullTypeName: composeIotaType( GlobalPauseKey.$typeName, ...[] ) as `${typeof PKG_V5}::deny_list::GlobalPauseKey`, typeArgs: [ ] as [], isPhantom: GlobalPauseKey.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => GlobalPauseKey.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => GlobalPauseKey.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => GlobalPauseKey.fromBcs( data, ), bcs: GlobalPauseKey.bcs, fromJSONField: (field: any) => GlobalPauseKey.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => GlobalPauseKey.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => GlobalPauseKey.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => GlobalPauseKey.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => GlobalPauseKey.fetch( client, id, ), new: ( fields: GlobalPauseKeyFields, ) => { return new GlobalPauseKey( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return GlobalPauseKey.reified() }

 static phantom( ): PhantomReified<ToTypeStr<GlobalPauseKey>> { return phantom(GlobalPauseKey.reified( )); } static get p() { return GlobalPauseKey.phantom() }

 static get bcs() { return bcs.struct("GlobalPauseKey", {

 dummy_field: bcs.bool()

}) };

 static fromFields( fields: Record<string, any> ): GlobalPauseKey { return GlobalPauseKey.reified( ).new( { dummyField: decodeFromFields("bool", fields.dummy_field) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): GlobalPauseKey { if (!isGlobalPauseKey(item.type)) { throw new Error("not a GlobalPauseKey type");

 }

 return GlobalPauseKey.reified( ).new( { dummyField: decodeFromFieldsWithTypes("bool", item.fields.dummy_field) } ) }

 static fromBcs( data: Uint8Array ): GlobalPauseKey { return GlobalPauseKey.fromFields( GlobalPauseKey.bcs.parse(data) ) }

 toJSONField() { return {

 dummyField: this.dummyField,

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): GlobalPauseKey { return GlobalPauseKey.reified( ).new( { dummyField: decodeFromJSONField("bool", field.dummyField) } ) }

 static fromJSON( json: Record<string, any> ): GlobalPauseKey { if (json.$typeName !== GlobalPauseKey.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return GlobalPauseKey.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): GlobalPauseKey { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isGlobalPauseKey(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a GlobalPauseKey object`); } return GlobalPauseKey.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): GlobalPauseKey { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isGlobalPauseKey(data.bcs.type)) { throw new Error(`object at is not a GlobalPauseKey object`); }

 return GlobalPauseKey.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return GlobalPauseKey.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<GlobalPauseKey> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching GlobalPauseKey object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isGlobalPauseKey(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a GlobalPauseKey object`); }

 return GlobalPauseKey.fromIotaObjectData( res.data ); }

 }

/* ============================== PerTypeConfigCreated =============================== */

export function isPerTypeConfigCreated(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V5}::deny_list::PerTypeConfigCreated`; }

export interface PerTypeConfigCreatedFields { key: ToField<ConfigKey>; configId: ToField<ID> }

export type PerTypeConfigCreatedReified = Reified< PerTypeConfigCreated, PerTypeConfigCreatedFields >;

export class PerTypeConfigCreated implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::deny_list::PerTypeConfigCreated`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = PerTypeConfigCreated.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::deny_list::PerTypeConfigCreated`; readonly $typeArgs: []; readonly $isPhantom = PerTypeConfigCreated.$isPhantom;

 readonly key: ToField<ConfigKey>; readonly configId: ToField<ID>

 private constructor(typeArgs: [], fields: PerTypeConfigCreatedFields, ) { this.$fullTypeName = composeIotaType( PerTypeConfigCreated.$typeName, ...typeArgs ) as `${typeof PKG_V5}::deny_list::PerTypeConfigCreated`; this.$typeArgs = typeArgs;

 this.key = fields.key;; this.configId = fields.configId; }

 static reified( ): PerTypeConfigCreatedReified { return { typeName: PerTypeConfigCreated.$typeName, fullTypeName: composeIotaType( PerTypeConfigCreated.$typeName, ...[] ) as `${typeof PKG_V5}::deny_list::PerTypeConfigCreated`, typeArgs: [ ] as [], isPhantom: PerTypeConfigCreated.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => PerTypeConfigCreated.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => PerTypeConfigCreated.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => PerTypeConfigCreated.fromBcs( data, ), bcs: PerTypeConfigCreated.bcs, fromJSONField: (field: any) => PerTypeConfigCreated.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => PerTypeConfigCreated.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => PerTypeConfigCreated.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => PerTypeConfigCreated.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => PerTypeConfigCreated.fetch( client, id, ), new: ( fields: PerTypeConfigCreatedFields, ) => { return new PerTypeConfigCreated( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return PerTypeConfigCreated.reified() }

 static phantom( ): PhantomReified<ToTypeStr<PerTypeConfigCreated>> { return phantom(PerTypeConfigCreated.reified( )); } static get p() { return PerTypeConfigCreated.phantom() }

 static get bcs() { return bcs.struct("PerTypeConfigCreated", {

 key: ConfigKey.bcs, config_id: ID.bcs

}) };

 static fromFields( fields: Record<string, any> ): PerTypeConfigCreated { return PerTypeConfigCreated.reified( ).new( { key: decodeFromFields(ConfigKey.reified(), fields.key), configId: decodeFromFields(ID.reified(), fields.config_id) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): PerTypeConfigCreated { if (!isPerTypeConfigCreated(item.type)) { throw new Error("not a PerTypeConfigCreated type");

 }

 return PerTypeConfigCreated.reified( ).new( { key: decodeFromFieldsWithTypes(ConfigKey.reified(), item.fields.key), configId: decodeFromFieldsWithTypes(ID.reified(), item.fields.config_id) } ) }

 static fromBcs( data: Uint8Array ): PerTypeConfigCreated { return PerTypeConfigCreated.fromFields( PerTypeConfigCreated.bcs.parse(data) ) }

 toJSONField() { return {

 key: this.key.toJSONField(),configId: this.configId,

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): PerTypeConfigCreated { return PerTypeConfigCreated.reified( ).new( { key: decodeFromJSONField(ConfigKey.reified(), field.key), configId: decodeFromJSONField(ID.reified(), field.configId) } ) }

 static fromJSON( json: Record<string, any> ): PerTypeConfigCreated { if (json.$typeName !== PerTypeConfigCreated.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return PerTypeConfigCreated.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): PerTypeConfigCreated { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isPerTypeConfigCreated(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a PerTypeConfigCreated object`); } return PerTypeConfigCreated.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): PerTypeConfigCreated { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isPerTypeConfigCreated(data.bcs.type)) { throw new Error(`object at is not a PerTypeConfigCreated object`); }

 return PerTypeConfigCreated.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return PerTypeConfigCreated.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<PerTypeConfigCreated> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching PerTypeConfigCreated object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isPerTypeConfigCreated(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a PerTypeConfigCreated object`); }

 return PerTypeConfigCreated.fromIotaObjectData( res.data ); }

 }
