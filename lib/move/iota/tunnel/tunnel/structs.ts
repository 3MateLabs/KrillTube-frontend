import * as reified from "../../_framework/reified";
import {Option} from "../../_dependencies/onchain/0x1/option/structs";
import {String} from "../../_dependencies/onchain/0x1/string/structs";
import {Balance} from "../../_dependencies/onchain/0x2/balance/structs";
import {ID, UID} from "../../_dependencies/onchain/0x2/object/structs";
import {PhantomReified, PhantomToTypeStr, PhantomTypeArgument, Reified, StructClass, ToField, ToPhantomTypeArgument, ToTypeStr, assertFieldsWithTypesArgsMatch, assertReifiedTypeArgsMatch, decodeFromFields, decodeFromFieldsWithTypes, decodeFromJSONField, extractType, fieldToJSON, phantom} from "../../_framework/reified";
import {FieldsWithTypes, composeIotaType, compressIotaType, parseTypeName} from "../../_framework/util";
import {Vector} from "../../_framework/vector";
import {PKG_V1} from "../index";
import {bcs} from "@iota/iota-sdk/bcs";
import {IotaClient, IotaObjectData, IotaParsedData} from "@iota/iota-sdk/client";
import {fromB64, fromHEX, toHEX} from "@iota/iota-sdk/utils";

/* ============================== ClaimReceipt =============================== */

export function isClaimReceipt(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V1}::tunnel::ClaimReceipt`; }

export interface ClaimReceiptFields { tunnelId: ToField<ID> }

export type ClaimReceiptReified = Reified< ClaimReceipt, ClaimReceiptFields >;

export class ClaimReceipt implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V1}::tunnel::ClaimReceipt`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = ClaimReceipt.$typeName; readonly $fullTypeName: `${typeof PKG_V1}::tunnel::ClaimReceipt`; readonly $typeArgs: []; readonly $isPhantom = ClaimReceipt.$isPhantom;

 readonly tunnelId: ToField<ID>

 private constructor(typeArgs: [], fields: ClaimReceiptFields, ) { this.$fullTypeName = composeIotaType( ClaimReceipt.$typeName, ...typeArgs ) as `${typeof PKG_V1}::tunnel::ClaimReceipt`; this.$typeArgs = typeArgs;

 this.tunnelId = fields.tunnelId; }

 static reified( ): ClaimReceiptReified { return { typeName: ClaimReceipt.$typeName, fullTypeName: composeIotaType( ClaimReceipt.$typeName, ...[] ) as `${typeof PKG_V1}::tunnel::ClaimReceipt`, typeArgs: [ ] as [], isPhantom: ClaimReceipt.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => ClaimReceipt.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => ClaimReceipt.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => ClaimReceipt.fromBcs( data, ), bcs: ClaimReceipt.bcs, fromJSONField: (field: any) => ClaimReceipt.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => ClaimReceipt.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => ClaimReceipt.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => ClaimReceipt.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => ClaimReceipt.fetch( client, id, ), new: ( fields: ClaimReceiptFields, ) => { return new ClaimReceipt( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return ClaimReceipt.reified() }

 static phantom( ): PhantomReified<ToTypeStr<ClaimReceipt>> { return phantom(ClaimReceipt.reified( )); } static get p() { return ClaimReceipt.phantom() }

 static get bcs() { return bcs.struct("ClaimReceipt", {

 tunnel_id: ID.bcs

}) };

 static fromFields( fields: Record<string, any> ): ClaimReceipt { return ClaimReceipt.reified( ).new( { tunnelId: decodeFromFields(ID.reified(), fields.tunnel_id) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): ClaimReceipt { if (!isClaimReceipt(item.type)) { throw new Error("not a ClaimReceipt type");

 }

 return ClaimReceipt.reified( ).new( { tunnelId: decodeFromFieldsWithTypes(ID.reified(), item.fields.tunnel_id) } ) }

 static fromBcs( data: Uint8Array ): ClaimReceipt { return ClaimReceipt.fromFields( ClaimReceipt.bcs.parse(data) ) }

 toJSONField() { return {

 tunnelId: this.tunnelId,

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): ClaimReceipt { return ClaimReceipt.reified( ).new( { tunnelId: decodeFromJSONField(ID.reified(), field.tunnelId) } ) }

 static fromJSON( json: Record<string, any> ): ClaimReceipt { if (json.$typeName !== ClaimReceipt.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return ClaimReceipt.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): ClaimReceipt { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isClaimReceipt(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a ClaimReceipt object`); } return ClaimReceipt.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): ClaimReceipt { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isClaimReceipt(data.bcs.type)) { throw new Error(`object at is not a ClaimReceipt object`); }

 return ClaimReceipt.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return ClaimReceipt.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<ClaimReceipt> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching ClaimReceipt object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isClaimReceipt(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a ClaimReceipt object`); }

 return ClaimReceipt.fromIotaObjectData( res.data ); }

 }

/* ============================== CloseInitiated =============================== */

export function isCloseInitiated(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V1}::tunnel::CloseInitiated`; }

export interface CloseInitiatedFields { tunnelId: ToField<ID>; initiatedBy: ToField<"address">; initiatedAt: ToField<"u64"> }

export type CloseInitiatedReified = Reified< CloseInitiated, CloseInitiatedFields >;

export class CloseInitiated implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V1}::tunnel::CloseInitiated`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = CloseInitiated.$typeName; readonly $fullTypeName: `${typeof PKG_V1}::tunnel::CloseInitiated`; readonly $typeArgs: []; readonly $isPhantom = CloseInitiated.$isPhantom;

 readonly tunnelId: ToField<ID>; readonly initiatedBy: ToField<"address">; readonly initiatedAt: ToField<"u64">

 private constructor(typeArgs: [], fields: CloseInitiatedFields, ) { this.$fullTypeName = composeIotaType( CloseInitiated.$typeName, ...typeArgs ) as `${typeof PKG_V1}::tunnel::CloseInitiated`; this.$typeArgs = typeArgs;

 this.tunnelId = fields.tunnelId;; this.initiatedBy = fields.initiatedBy;; this.initiatedAt = fields.initiatedAt; }

 static reified( ): CloseInitiatedReified { return { typeName: CloseInitiated.$typeName, fullTypeName: composeIotaType( CloseInitiated.$typeName, ...[] ) as `${typeof PKG_V1}::tunnel::CloseInitiated`, typeArgs: [ ] as [], isPhantom: CloseInitiated.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => CloseInitiated.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => CloseInitiated.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => CloseInitiated.fromBcs( data, ), bcs: CloseInitiated.bcs, fromJSONField: (field: any) => CloseInitiated.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => CloseInitiated.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => CloseInitiated.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => CloseInitiated.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => CloseInitiated.fetch( client, id, ), new: ( fields: CloseInitiatedFields, ) => { return new CloseInitiated( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return CloseInitiated.reified() }

 static phantom( ): PhantomReified<ToTypeStr<CloseInitiated>> { return phantom(CloseInitiated.reified( )); } static get p() { return CloseInitiated.phantom() }

 static get bcs() { return bcs.struct("CloseInitiated", {

 tunnel_id: ID.bcs, initiated_by: bcs.bytes(32).transform({ input: (val: string) => fromHEX(val), output: (val: Uint8Array) => toHEX(val), }), initiated_at: bcs.u64()

}) };

 static fromFields( fields: Record<string, any> ): CloseInitiated { return CloseInitiated.reified( ).new( { tunnelId: decodeFromFields(ID.reified(), fields.tunnel_id), initiatedBy: decodeFromFields("address", fields.initiated_by), initiatedAt: decodeFromFields("u64", fields.initiated_at) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): CloseInitiated { if (!isCloseInitiated(item.type)) { throw new Error("not a CloseInitiated type");

 }

 return CloseInitiated.reified( ).new( { tunnelId: decodeFromFieldsWithTypes(ID.reified(), item.fields.tunnel_id), initiatedBy: decodeFromFieldsWithTypes("address", item.fields.initiated_by), initiatedAt: decodeFromFieldsWithTypes("u64", item.fields.initiated_at) } ) }

 static fromBcs( data: Uint8Array ): CloseInitiated { return CloseInitiated.fromFields( CloseInitiated.bcs.parse(data) ) }

 toJSONField() { return {

 tunnelId: this.tunnelId,initiatedBy: this.initiatedBy,initiatedAt: this.initiatedAt.toString(),

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): CloseInitiated { return CloseInitiated.reified( ).new( { tunnelId: decodeFromJSONField(ID.reified(), field.tunnelId), initiatedBy: decodeFromJSONField("address", field.initiatedBy), initiatedAt: decodeFromJSONField("u64", field.initiatedAt) } ) }

 static fromJSON( json: Record<string, any> ): CloseInitiated { if (json.$typeName !== CloseInitiated.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return CloseInitiated.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): CloseInitiated { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isCloseInitiated(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a CloseInitiated object`); } return CloseInitiated.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): CloseInitiated { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isCloseInitiated(data.bcs.type)) { throw new Error(`object at is not a CloseInitiated object`); }

 return CloseInitiated.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return CloseInitiated.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<CloseInitiated> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching CloseInitiated object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isCloseInitiated(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a CloseInitiated object`); }

 return CloseInitiated.fromIotaObjectData( res.data ); }

 }

/* ============================== CreatorConfig =============================== */

export function isCreatorConfig(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V1}::tunnel::CreatorConfig`; }

export interface CreatorConfigFields { id: ToField<UID>; creator: ToField<"address">; operator: ToField<"address">; receiverConfigs: ToField<Vector<ReceiverConfig>>; operatorPublicKey: ToField<Vector<"u8">>; metadata: ToField<String>; gracePeriodMs: ToField<"u64"> }

export type CreatorConfigReified = Reified< CreatorConfig, CreatorConfigFields >;

export class CreatorConfig implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V1}::tunnel::CreatorConfig`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = CreatorConfig.$typeName; readonly $fullTypeName: `${typeof PKG_V1}::tunnel::CreatorConfig`; readonly $typeArgs: []; readonly $isPhantom = CreatorConfig.$isPhantom;

 readonly id: ToField<UID>; readonly creator: ToField<"address">; readonly operator: ToField<"address">; readonly receiverConfigs: ToField<Vector<ReceiverConfig>>; readonly operatorPublicKey: ToField<Vector<"u8">>; readonly metadata: ToField<String>; readonly gracePeriodMs: ToField<"u64">

 private constructor(typeArgs: [], fields: CreatorConfigFields, ) { this.$fullTypeName = composeIotaType( CreatorConfig.$typeName, ...typeArgs ) as `${typeof PKG_V1}::tunnel::CreatorConfig`; this.$typeArgs = typeArgs;

 this.id = fields.id;; this.creator = fields.creator;; this.operator = fields.operator;; this.receiverConfigs = fields.receiverConfigs;; this.operatorPublicKey = fields.operatorPublicKey;; this.metadata = fields.metadata;; this.gracePeriodMs = fields.gracePeriodMs; }

 static reified( ): CreatorConfigReified { return { typeName: CreatorConfig.$typeName, fullTypeName: composeIotaType( CreatorConfig.$typeName, ...[] ) as `${typeof PKG_V1}::tunnel::CreatorConfig`, typeArgs: [ ] as [], isPhantom: CreatorConfig.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => CreatorConfig.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => CreatorConfig.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => CreatorConfig.fromBcs( data, ), bcs: CreatorConfig.bcs, fromJSONField: (field: any) => CreatorConfig.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => CreatorConfig.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => CreatorConfig.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => CreatorConfig.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => CreatorConfig.fetch( client, id, ), new: ( fields: CreatorConfigFields, ) => { return new CreatorConfig( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return CreatorConfig.reified() }

 static phantom( ): PhantomReified<ToTypeStr<CreatorConfig>> { return phantom(CreatorConfig.reified( )); } static get p() { return CreatorConfig.phantom() }

 static get bcs() { return bcs.struct("CreatorConfig", {

 id: UID.bcs, creator: bcs.bytes(32).transform({ input: (val: string) => fromHEX(val), output: (val: Uint8Array) => toHEX(val), }), operator: bcs.bytes(32).transform({ input: (val: string) => fromHEX(val), output: (val: Uint8Array) => toHEX(val), }), receiver_configs: bcs.vector(ReceiverConfig.bcs), operator_public_key: bcs.vector(bcs.u8()), metadata: String.bcs, grace_period_ms: bcs.u64()

}) };

 static fromFields( fields: Record<string, any> ): CreatorConfig { return CreatorConfig.reified( ).new( { id: decodeFromFields(UID.reified(), fields.id), creator: decodeFromFields("address", fields.creator), operator: decodeFromFields("address", fields.operator), receiverConfigs: decodeFromFields(reified.vector(ReceiverConfig.reified()), fields.receiver_configs), operatorPublicKey: decodeFromFields(reified.vector("u8"), fields.operator_public_key), metadata: decodeFromFields(String.reified(), fields.metadata), gracePeriodMs: decodeFromFields("u64", fields.grace_period_ms) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): CreatorConfig { if (!isCreatorConfig(item.type)) { throw new Error("not a CreatorConfig type");

 }

 return CreatorConfig.reified( ).new( { id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id), creator: decodeFromFieldsWithTypes("address", item.fields.creator), operator: decodeFromFieldsWithTypes("address", item.fields.operator), receiverConfigs: decodeFromFieldsWithTypes(reified.vector(ReceiverConfig.reified()), item.fields.receiver_configs), operatorPublicKey: decodeFromFieldsWithTypes(reified.vector("u8"), item.fields.operator_public_key), metadata: decodeFromFieldsWithTypes(String.reified(), item.fields.metadata), gracePeriodMs: decodeFromFieldsWithTypes("u64", item.fields.grace_period_ms) } ) }

 static fromBcs( data: Uint8Array ): CreatorConfig { return CreatorConfig.fromFields( CreatorConfig.bcs.parse(data) ) }

 toJSONField() { return {

 id: this.id,creator: this.creator,operator: this.operator,receiverConfigs: fieldToJSON<Vector<ReceiverConfig>>(`vector<${ReceiverConfig.$typeName}>`, this.receiverConfigs),operatorPublicKey: fieldToJSON<Vector<"u8">>(`vector<u8>`, this.operatorPublicKey),metadata: this.metadata,gracePeriodMs: this.gracePeriodMs.toString(),

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): CreatorConfig { return CreatorConfig.reified( ).new( { id: decodeFromJSONField(UID.reified(), field.id), creator: decodeFromJSONField("address", field.creator), operator: decodeFromJSONField("address", field.operator), receiverConfigs: decodeFromJSONField(reified.vector(ReceiverConfig.reified()), field.receiverConfigs), operatorPublicKey: decodeFromJSONField(reified.vector("u8"), field.operatorPublicKey), metadata: decodeFromJSONField(String.reified(), field.metadata), gracePeriodMs: decodeFromJSONField("u64", field.gracePeriodMs) } ) }

 static fromJSON( json: Record<string, any> ): CreatorConfig { if (json.$typeName !== CreatorConfig.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return CreatorConfig.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): CreatorConfig { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isCreatorConfig(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a CreatorConfig object`); } return CreatorConfig.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): CreatorConfig { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isCreatorConfig(data.bcs.type)) { throw new Error(`object at is not a CreatorConfig object`); }

 return CreatorConfig.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return CreatorConfig.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<CreatorConfig> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching CreatorConfig object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isCreatorConfig(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a CreatorConfig object`); }

 return CreatorConfig.fromIotaObjectData( res.data ); }

 }

/* ============================== CreatorConfigCreated =============================== */

export function isCreatorConfigCreated(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V1}::tunnel::CreatorConfigCreated`; }

export interface CreatorConfigCreatedFields { configId: ToField<ID>; creator: ToField<"address">; operatorPublicKey: ToField<Vector<"u8">> }

export type CreatorConfigCreatedReified = Reified< CreatorConfigCreated, CreatorConfigCreatedFields >;

export class CreatorConfigCreated implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V1}::tunnel::CreatorConfigCreated`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = CreatorConfigCreated.$typeName; readonly $fullTypeName: `${typeof PKG_V1}::tunnel::CreatorConfigCreated`; readonly $typeArgs: []; readonly $isPhantom = CreatorConfigCreated.$isPhantom;

 readonly configId: ToField<ID>; readonly creator: ToField<"address">; readonly operatorPublicKey: ToField<Vector<"u8">>

 private constructor(typeArgs: [], fields: CreatorConfigCreatedFields, ) { this.$fullTypeName = composeIotaType( CreatorConfigCreated.$typeName, ...typeArgs ) as `${typeof PKG_V1}::tunnel::CreatorConfigCreated`; this.$typeArgs = typeArgs;

 this.configId = fields.configId;; this.creator = fields.creator;; this.operatorPublicKey = fields.operatorPublicKey; }

 static reified( ): CreatorConfigCreatedReified { return { typeName: CreatorConfigCreated.$typeName, fullTypeName: composeIotaType( CreatorConfigCreated.$typeName, ...[] ) as `${typeof PKG_V1}::tunnel::CreatorConfigCreated`, typeArgs: [ ] as [], isPhantom: CreatorConfigCreated.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => CreatorConfigCreated.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => CreatorConfigCreated.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => CreatorConfigCreated.fromBcs( data, ), bcs: CreatorConfigCreated.bcs, fromJSONField: (field: any) => CreatorConfigCreated.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => CreatorConfigCreated.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => CreatorConfigCreated.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => CreatorConfigCreated.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => CreatorConfigCreated.fetch( client, id, ), new: ( fields: CreatorConfigCreatedFields, ) => { return new CreatorConfigCreated( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return CreatorConfigCreated.reified() }

 static phantom( ): PhantomReified<ToTypeStr<CreatorConfigCreated>> { return phantom(CreatorConfigCreated.reified( )); } static get p() { return CreatorConfigCreated.phantom() }

 static get bcs() { return bcs.struct("CreatorConfigCreated", {

 config_id: ID.bcs, creator: bcs.bytes(32).transform({ input: (val: string) => fromHEX(val), output: (val: Uint8Array) => toHEX(val), }), operator_public_key: bcs.vector(bcs.u8())

}) };

 static fromFields( fields: Record<string, any> ): CreatorConfigCreated { return CreatorConfigCreated.reified( ).new( { configId: decodeFromFields(ID.reified(), fields.config_id), creator: decodeFromFields("address", fields.creator), operatorPublicKey: decodeFromFields(reified.vector("u8"), fields.operator_public_key) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): CreatorConfigCreated { if (!isCreatorConfigCreated(item.type)) { throw new Error("not a CreatorConfigCreated type");

 }

 return CreatorConfigCreated.reified( ).new( { configId: decodeFromFieldsWithTypes(ID.reified(), item.fields.config_id), creator: decodeFromFieldsWithTypes("address", item.fields.creator), operatorPublicKey: decodeFromFieldsWithTypes(reified.vector("u8"), item.fields.operator_public_key) } ) }

 static fromBcs( data: Uint8Array ): CreatorConfigCreated { return CreatorConfigCreated.fromFields( CreatorConfigCreated.bcs.parse(data) ) }

 toJSONField() { return {

 configId: this.configId,creator: this.creator,operatorPublicKey: fieldToJSON<Vector<"u8">>(`vector<u8>`, this.operatorPublicKey),

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): CreatorConfigCreated { return CreatorConfigCreated.reified( ).new( { configId: decodeFromJSONField(ID.reified(), field.configId), creator: decodeFromJSONField("address", field.creator), operatorPublicKey: decodeFromJSONField(reified.vector("u8"), field.operatorPublicKey) } ) }

 static fromJSON( json: Record<string, any> ): CreatorConfigCreated { if (json.$typeName !== CreatorConfigCreated.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return CreatorConfigCreated.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): CreatorConfigCreated { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isCreatorConfigCreated(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a CreatorConfigCreated object`); } return CreatorConfigCreated.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): CreatorConfigCreated { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isCreatorConfigCreated(data.bcs.type)) { throw new Error(`object at is not a CreatorConfigCreated object`); }

 return CreatorConfigCreated.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return CreatorConfigCreated.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<CreatorConfigCreated> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching CreatorConfigCreated object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isCreatorConfigCreated(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a CreatorConfigCreated object`); }

 return CreatorConfigCreated.fromIotaObjectData( res.data ); }

 }

/* ============================== FundsClaimed =============================== */

export function isFundsClaimed(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V1}::tunnel::FundsClaimed`; }

export interface FundsClaimedFields { tunnelId: ToField<ID>; amount: ToField<"u64">; totalClaimed: ToField<"u64">; claimedBy: ToField<"address"> }

export type FundsClaimedReified = Reified< FundsClaimed, FundsClaimedFields >;

export class FundsClaimed implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V1}::tunnel::FundsClaimed`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = FundsClaimed.$typeName; readonly $fullTypeName: `${typeof PKG_V1}::tunnel::FundsClaimed`; readonly $typeArgs: []; readonly $isPhantom = FundsClaimed.$isPhantom;

 readonly tunnelId: ToField<ID>; readonly amount: ToField<"u64">; readonly totalClaimed: ToField<"u64">; readonly claimedBy: ToField<"address">

 private constructor(typeArgs: [], fields: FundsClaimedFields, ) { this.$fullTypeName = composeIotaType( FundsClaimed.$typeName, ...typeArgs ) as `${typeof PKG_V1}::tunnel::FundsClaimed`; this.$typeArgs = typeArgs;

 this.tunnelId = fields.tunnelId;; this.amount = fields.amount;; this.totalClaimed = fields.totalClaimed;; this.claimedBy = fields.claimedBy; }

 static reified( ): FundsClaimedReified { return { typeName: FundsClaimed.$typeName, fullTypeName: composeIotaType( FundsClaimed.$typeName, ...[] ) as `${typeof PKG_V1}::tunnel::FundsClaimed`, typeArgs: [ ] as [], isPhantom: FundsClaimed.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => FundsClaimed.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => FundsClaimed.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => FundsClaimed.fromBcs( data, ), bcs: FundsClaimed.bcs, fromJSONField: (field: any) => FundsClaimed.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => FundsClaimed.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => FundsClaimed.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => FundsClaimed.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => FundsClaimed.fetch( client, id, ), new: ( fields: FundsClaimedFields, ) => { return new FundsClaimed( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return FundsClaimed.reified() }

 static phantom( ): PhantomReified<ToTypeStr<FundsClaimed>> { return phantom(FundsClaimed.reified( )); } static get p() { return FundsClaimed.phantom() }

 static get bcs() { return bcs.struct("FundsClaimed", {

 tunnel_id: ID.bcs, amount: bcs.u64(), total_claimed: bcs.u64(), claimed_by: bcs.bytes(32).transform({ input: (val: string) => fromHEX(val), output: (val: Uint8Array) => toHEX(val), })

}) };

 static fromFields( fields: Record<string, any> ): FundsClaimed { return FundsClaimed.reified( ).new( { tunnelId: decodeFromFields(ID.reified(), fields.tunnel_id), amount: decodeFromFields("u64", fields.amount), totalClaimed: decodeFromFields("u64", fields.total_claimed), claimedBy: decodeFromFields("address", fields.claimed_by) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): FundsClaimed { if (!isFundsClaimed(item.type)) { throw new Error("not a FundsClaimed type");

 }

 return FundsClaimed.reified( ).new( { tunnelId: decodeFromFieldsWithTypes(ID.reified(), item.fields.tunnel_id), amount: decodeFromFieldsWithTypes("u64", item.fields.amount), totalClaimed: decodeFromFieldsWithTypes("u64", item.fields.total_claimed), claimedBy: decodeFromFieldsWithTypes("address", item.fields.claimed_by) } ) }

 static fromBcs( data: Uint8Array ): FundsClaimed { return FundsClaimed.fromFields( FundsClaimed.bcs.parse(data) ) }

 toJSONField() { return {

 tunnelId: this.tunnelId,amount: this.amount.toString(),totalClaimed: this.totalClaimed.toString(),claimedBy: this.claimedBy,

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): FundsClaimed { return FundsClaimed.reified( ).new( { tunnelId: decodeFromJSONField(ID.reified(), field.tunnelId), amount: decodeFromJSONField("u64", field.amount), totalClaimed: decodeFromJSONField("u64", field.totalClaimed), claimedBy: decodeFromJSONField("address", field.claimedBy) } ) }

 static fromJSON( json: Record<string, any> ): FundsClaimed { if (json.$typeName !== FundsClaimed.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return FundsClaimed.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): FundsClaimed { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isFundsClaimed(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a FundsClaimed object`); } return FundsClaimed.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): FundsClaimed { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isFundsClaimed(data.bcs.type)) { throw new Error(`object at is not a FundsClaimed object`); }

 return FundsClaimed.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return FundsClaimed.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<FundsClaimed> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching FundsClaimed object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isFundsClaimed(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a FundsClaimed object`); }

 return FundsClaimed.fromIotaObjectData( res.data ); }

 }

/* ============================== PaymentProcessed =============================== */

export function isPaymentProcessed(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V1}::tunnel::PaymentProcessed`; }

export interface PaymentProcessedFields { configId: ToField<ID>; payer: ToField<"address">; referrer: ToField<"address">; amount: ToField<"u64">; timestampMs: ToField<"u64"> }

export type PaymentProcessedReified = Reified< PaymentProcessed, PaymentProcessedFields >;

export class PaymentProcessed implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V1}::tunnel::PaymentProcessed`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = PaymentProcessed.$typeName; readonly $fullTypeName: `${typeof PKG_V1}::tunnel::PaymentProcessed`; readonly $typeArgs: []; readonly $isPhantom = PaymentProcessed.$isPhantom;

 readonly configId: ToField<ID>; readonly payer: ToField<"address">; readonly referrer: ToField<"address">; readonly amount: ToField<"u64">; readonly timestampMs: ToField<"u64">

 private constructor(typeArgs: [], fields: PaymentProcessedFields, ) { this.$fullTypeName = composeIotaType( PaymentProcessed.$typeName, ...typeArgs ) as `${typeof PKG_V1}::tunnel::PaymentProcessed`; this.$typeArgs = typeArgs;

 this.configId = fields.configId;; this.payer = fields.payer;; this.referrer = fields.referrer;; this.amount = fields.amount;; this.timestampMs = fields.timestampMs; }

 static reified( ): PaymentProcessedReified { return { typeName: PaymentProcessed.$typeName, fullTypeName: composeIotaType( PaymentProcessed.$typeName, ...[] ) as `${typeof PKG_V1}::tunnel::PaymentProcessed`, typeArgs: [ ] as [], isPhantom: PaymentProcessed.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => PaymentProcessed.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => PaymentProcessed.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => PaymentProcessed.fromBcs( data, ), bcs: PaymentProcessed.bcs, fromJSONField: (field: any) => PaymentProcessed.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => PaymentProcessed.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => PaymentProcessed.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => PaymentProcessed.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => PaymentProcessed.fetch( client, id, ), new: ( fields: PaymentProcessedFields, ) => { return new PaymentProcessed( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return PaymentProcessed.reified() }

 static phantom( ): PhantomReified<ToTypeStr<PaymentProcessed>> { return phantom(PaymentProcessed.reified( )); } static get p() { return PaymentProcessed.phantom() }

 static get bcs() { return bcs.struct("PaymentProcessed", {

 config_id: ID.bcs, payer: bcs.bytes(32).transform({ input: (val: string) => fromHEX(val), output: (val: Uint8Array) => toHEX(val), }), referrer: bcs.bytes(32).transform({ input: (val: string) => fromHEX(val), output: (val: Uint8Array) => toHEX(val), }), amount: bcs.u64(), timestamp_ms: bcs.u64()

}) };

 static fromFields( fields: Record<string, any> ): PaymentProcessed { return PaymentProcessed.reified( ).new( { configId: decodeFromFields(ID.reified(), fields.config_id), payer: decodeFromFields("address", fields.payer), referrer: decodeFromFields("address", fields.referrer), amount: decodeFromFields("u64", fields.amount), timestampMs: decodeFromFields("u64", fields.timestamp_ms) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): PaymentProcessed { if (!isPaymentProcessed(item.type)) { throw new Error("not a PaymentProcessed type");

 }

 return PaymentProcessed.reified( ).new( { configId: decodeFromFieldsWithTypes(ID.reified(), item.fields.config_id), payer: decodeFromFieldsWithTypes("address", item.fields.payer), referrer: decodeFromFieldsWithTypes("address", item.fields.referrer), amount: decodeFromFieldsWithTypes("u64", item.fields.amount), timestampMs: decodeFromFieldsWithTypes("u64", item.fields.timestamp_ms) } ) }

 static fromBcs( data: Uint8Array ): PaymentProcessed { return PaymentProcessed.fromFields( PaymentProcessed.bcs.parse(data) ) }

 toJSONField() { return {

 configId: this.configId,payer: this.payer,referrer: this.referrer,amount: this.amount.toString(),timestampMs: this.timestampMs.toString(),

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): PaymentProcessed { return PaymentProcessed.reified( ).new( { configId: decodeFromJSONField(ID.reified(), field.configId), payer: decodeFromJSONField("address", field.payer), referrer: decodeFromJSONField("address", field.referrer), amount: decodeFromJSONField("u64", field.amount), timestampMs: decodeFromJSONField("u64", field.timestampMs) } ) }

 static fromJSON( json: Record<string, any> ): PaymentProcessed { if (json.$typeName !== PaymentProcessed.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return PaymentProcessed.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): PaymentProcessed { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isPaymentProcessed(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a PaymentProcessed object`); } return PaymentProcessed.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): PaymentProcessed { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isPaymentProcessed(data.bcs.type)) { throw new Error(`object at is not a PaymentProcessed object`); }

 return PaymentProcessed.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return PaymentProcessed.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<PaymentProcessed> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching PaymentProcessed object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isPaymentProcessed(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a PaymentProcessed object`); }

 return PaymentProcessed.fromIotaObjectData( res.data ); }

 }

/* ============================== ReceiverConfig =============================== */

export function isReceiverConfig(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V1}::tunnel::ReceiverConfig`; }

export interface ReceiverConfigFields { type: ToField<"u64">; feeBps: ToField<"u64">; address: ToField<"address"> }

export type ReceiverConfigReified = Reified< ReceiverConfig, ReceiverConfigFields >;

export class ReceiverConfig implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V1}::tunnel::ReceiverConfig`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = ReceiverConfig.$typeName; readonly $fullTypeName: `${typeof PKG_V1}::tunnel::ReceiverConfig`; readonly $typeArgs: []; readonly $isPhantom = ReceiverConfig.$isPhantom;

 readonly type: ToField<"u64">; readonly feeBps: ToField<"u64">; readonly address: ToField<"address">

 private constructor(typeArgs: [], fields: ReceiverConfigFields, ) { this.$fullTypeName = composeIotaType( ReceiverConfig.$typeName, ...typeArgs ) as `${typeof PKG_V1}::tunnel::ReceiverConfig`; this.$typeArgs = typeArgs;

 this.type = fields.type;; this.feeBps = fields.feeBps;; this.address = fields.address; }

 static reified( ): ReceiverConfigReified { return { typeName: ReceiverConfig.$typeName, fullTypeName: composeIotaType( ReceiverConfig.$typeName, ...[] ) as `${typeof PKG_V1}::tunnel::ReceiverConfig`, typeArgs: [ ] as [], isPhantom: ReceiverConfig.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => ReceiverConfig.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => ReceiverConfig.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => ReceiverConfig.fromBcs( data, ), bcs: ReceiverConfig.bcs, fromJSONField: (field: any) => ReceiverConfig.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => ReceiverConfig.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => ReceiverConfig.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => ReceiverConfig.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => ReceiverConfig.fetch( client, id, ), new: ( fields: ReceiverConfigFields, ) => { return new ReceiverConfig( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return ReceiverConfig.reified() }

 static phantom( ): PhantomReified<ToTypeStr<ReceiverConfig>> { return phantom(ReceiverConfig.reified( )); } static get p() { return ReceiverConfig.phantom() }

 static get bcs() { return bcs.struct("ReceiverConfig", {

 _type: bcs.u64(), fee_bps: bcs.u64(), _address: bcs.bytes(32).transform({ input: (val: string) => fromHEX(val), output: (val: Uint8Array) => toHEX(val), })

}) };

 static fromFields( fields: Record<string, any> ): ReceiverConfig { return ReceiverConfig.reified( ).new( { type: decodeFromFields("u64", fields._type), feeBps: decodeFromFields("u64", fields.fee_bps), address: decodeFromFields("address", fields._address) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): ReceiverConfig { if (!isReceiverConfig(item.type)) { throw new Error("not a ReceiverConfig type");

 }

 return ReceiverConfig.reified( ).new( { type: decodeFromFieldsWithTypes("u64", item.fields._type), feeBps: decodeFromFieldsWithTypes("u64", item.fields.fee_bps), address: decodeFromFieldsWithTypes("address", item.fields._address) } ) }

 static fromBcs( data: Uint8Array ): ReceiverConfig { return ReceiverConfig.fromFields( ReceiverConfig.bcs.parse(data) ) }

 toJSONField() { return {

 type: this.type.toString(),feeBps: this.feeBps.toString(),address: this.address,

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): ReceiverConfig { return ReceiverConfig.reified( ).new( { type: decodeFromJSONField("u64", field.type), feeBps: decodeFromJSONField("u64", field.feeBps), address: decodeFromJSONField("address", field.address) } ) }

 static fromJSON( json: Record<string, any> ): ReceiverConfig { if (json.$typeName !== ReceiverConfig.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return ReceiverConfig.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): ReceiverConfig { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isReceiverConfig(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a ReceiverConfig object`); } return ReceiverConfig.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): ReceiverConfig { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isReceiverConfig(data.bcs.type)) { throw new Error(`object at is not a ReceiverConfig object`); }

 return ReceiverConfig.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return ReceiverConfig.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<ReceiverConfig> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching ReceiverConfig object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isReceiverConfig(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a ReceiverConfig object`); }

 return ReceiverConfig.fromIotaObjectData( res.data ); }

 }

/* ============================== Tunnel =============================== */

export function isTunnel(type: string): boolean { type = compressIotaType(type); return type.startsWith(`${PKG_V1}::tunnel::Tunnel` + '<'); }

export interface TunnelFields<T0 extends PhantomTypeArgument> { id: ToField<UID>; payer: ToField<"address">; creator: ToField<"address">; operator: ToField<"address">; receiverConfigs: ToField<Vector<ReceiverConfig>>; payerPublicKey: ToField<Vector<"u8">>; operatorPublicKey: ToField<Vector<"u8">>; credential: ToField<Vector<"u8">>; gracePeriodMs: ToField<"u64">; totalDeposit: ToField<"u64">; claimedAmount: ToField<"u64">; balance: ToField<Balance<T0>>; isClosed: ToField<"bool">; closeInitiatedAt: ToField<Option<"u64">>; closeInitiatedBy: ToField<Option<"address">> }

export type TunnelReified<T0 extends PhantomTypeArgument> = Reified< Tunnel<T0>, TunnelFields<T0> >;

export class Tunnel<T0 extends PhantomTypeArgument> implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V1}::tunnel::Tunnel`; static readonly $numTypeParams = 1; static readonly $isPhantom = [true,] as const;

 readonly $typeName = Tunnel.$typeName; readonly $fullTypeName: `${typeof PKG_V1}::tunnel::Tunnel<${PhantomToTypeStr<T0>}>`; readonly $typeArgs: [PhantomToTypeStr<T0>]; readonly $isPhantom = Tunnel.$isPhantom;

 readonly id: ToField<UID>; readonly payer: ToField<"address">; readonly creator: ToField<"address">; readonly operator: ToField<"address">; readonly receiverConfigs: ToField<Vector<ReceiverConfig>>; readonly payerPublicKey: ToField<Vector<"u8">>; readonly operatorPublicKey: ToField<Vector<"u8">>; readonly credential: ToField<Vector<"u8">>; readonly gracePeriodMs: ToField<"u64">; readonly totalDeposit: ToField<"u64">; readonly claimedAmount: ToField<"u64">; readonly balance: ToField<Balance<T0>>; readonly isClosed: ToField<"bool">; readonly closeInitiatedAt: ToField<Option<"u64">>; readonly closeInitiatedBy: ToField<Option<"address">>

 private constructor(typeArgs: [PhantomToTypeStr<T0>], fields: TunnelFields<T0>, ) { this.$fullTypeName = composeIotaType( Tunnel.$typeName, ...typeArgs ) as `${typeof PKG_V1}::tunnel::Tunnel<${PhantomToTypeStr<T0>}>`; this.$typeArgs = typeArgs;

 this.id = fields.id;; this.payer = fields.payer;; this.creator = fields.creator;; this.operator = fields.operator;; this.receiverConfigs = fields.receiverConfigs;; this.payerPublicKey = fields.payerPublicKey;; this.operatorPublicKey = fields.operatorPublicKey;; this.credential = fields.credential;; this.gracePeriodMs = fields.gracePeriodMs;; this.totalDeposit = fields.totalDeposit;; this.claimedAmount = fields.claimedAmount;; this.balance = fields.balance;; this.isClosed = fields.isClosed;; this.closeInitiatedAt = fields.closeInitiatedAt;; this.closeInitiatedBy = fields.closeInitiatedBy; }

 static reified<T0 extends PhantomReified<PhantomTypeArgument>>( T0: T0 ): TunnelReified<ToPhantomTypeArgument<T0>> { return { typeName: Tunnel.$typeName, fullTypeName: composeIotaType( Tunnel.$typeName, ...[extractType(T0)] ) as `${typeof PKG_V1}::tunnel::Tunnel<${PhantomToTypeStr<ToPhantomTypeArgument<T0>>}>`, typeArgs: [ extractType(T0) ] as [PhantomToTypeStr<ToPhantomTypeArgument<T0>>], isPhantom: Tunnel.$isPhantom, reifiedTypeArgs: [T0], fromFields: (fields: Record<string, any>) => Tunnel.fromFields( T0, fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => Tunnel.fromFieldsWithTypes( T0, item, ), fromBcs: (data: Uint8Array) => Tunnel.fromBcs( T0, data, ), bcs: Tunnel.bcs, fromJSONField: (field: any) => Tunnel.fromJSONField( T0, field, ), fromJSON: (json: Record<string, any>) => Tunnel.fromJSON( T0, json, ), fromIotaParsedData: (content: IotaParsedData) => Tunnel.fromIotaParsedData( T0, content, ), fromIotaObjectData: (content: IotaObjectData) => Tunnel.fromIotaObjectData( T0, content, ), fetch: async (client: IotaClient, id: string) => Tunnel.fetch( client, T0, id, ), new: ( fields: TunnelFields<ToPhantomTypeArgument<T0>>, ) => { return new Tunnel( [extractType(T0)], fields ) }, kind: "StructClassReified", } }

 static get r() { return Tunnel.reified }

 static phantom<T0 extends PhantomReified<PhantomTypeArgument>>( T0: T0 ): PhantomReified<ToTypeStr<Tunnel<ToPhantomTypeArgument<T0>>>> { return phantom(Tunnel.reified( T0 )); } static get p() { return Tunnel.phantom }

 static get bcs() { return bcs.struct("Tunnel", {

 id: UID.bcs, payer: bcs.bytes(32).transform({ input: (val: string) => fromHEX(val), output: (val: Uint8Array) => toHEX(val), }), creator: bcs.bytes(32).transform({ input: (val: string) => fromHEX(val), output: (val: Uint8Array) => toHEX(val), }), operator: bcs.bytes(32).transform({ input: (val: string) => fromHEX(val), output: (val: Uint8Array) => toHEX(val), }), receiver_configs: bcs.vector(ReceiverConfig.bcs), payer_public_key: bcs.vector(bcs.u8()), operator_public_key: bcs.vector(bcs.u8()), credential: bcs.vector(bcs.u8()), grace_period_ms: bcs.u64(), total_deposit: bcs.u64(), claimed_amount: bcs.u64(), balance: Balance.bcs, is_closed: bcs.bool(), close_initiated_at: Option.bcs(bcs.u64()), close_initiated_by: Option.bcs(bcs.bytes(32).transform({ input: (val: string) => fromHEX(val), output: (val: Uint8Array) => toHEX(val), }))

}) };

 static fromFields<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, fields: Record<string, any> ): Tunnel<ToPhantomTypeArgument<T0>> { return Tunnel.reified( typeArg, ).new( { id: decodeFromFields(UID.reified(), fields.id), payer: decodeFromFields("address", fields.payer), creator: decodeFromFields("address", fields.creator), operator: decodeFromFields("address", fields.operator), receiverConfigs: decodeFromFields(reified.vector(ReceiverConfig.reified()), fields.receiver_configs), payerPublicKey: decodeFromFields(reified.vector("u8"), fields.payer_public_key), operatorPublicKey: decodeFromFields(reified.vector("u8"), fields.operator_public_key), credential: decodeFromFields(reified.vector("u8"), fields.credential), gracePeriodMs: decodeFromFields("u64", fields.grace_period_ms), totalDeposit: decodeFromFields("u64", fields.total_deposit), claimedAmount: decodeFromFields("u64", fields.claimed_amount), balance: decodeFromFields(Balance.reified(typeArg), fields.balance), isClosed: decodeFromFields("bool", fields.is_closed), closeInitiatedAt: decodeFromFields(Option.reified("u64"), fields.close_initiated_at), closeInitiatedBy: decodeFromFields(Option.reified("address"), fields.close_initiated_by) } ) }

 static fromFieldsWithTypes<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, item: FieldsWithTypes ): Tunnel<ToPhantomTypeArgument<T0>> { if (!isTunnel(item.type)) { throw new Error("not a Tunnel type");

 } assertFieldsWithTypesArgsMatch(item, [typeArg]);

 return Tunnel.reified( typeArg, ).new( { id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id), payer: decodeFromFieldsWithTypes("address", item.fields.payer), creator: decodeFromFieldsWithTypes("address", item.fields.creator), operator: decodeFromFieldsWithTypes("address", item.fields.operator), receiverConfigs: decodeFromFieldsWithTypes(reified.vector(ReceiverConfig.reified()), item.fields.receiver_configs), payerPublicKey: decodeFromFieldsWithTypes(reified.vector("u8"), item.fields.payer_public_key), operatorPublicKey: decodeFromFieldsWithTypes(reified.vector("u8"), item.fields.operator_public_key), credential: decodeFromFieldsWithTypes(reified.vector("u8"), item.fields.credential), gracePeriodMs: decodeFromFieldsWithTypes("u64", item.fields.grace_period_ms), totalDeposit: decodeFromFieldsWithTypes("u64", item.fields.total_deposit), claimedAmount: decodeFromFieldsWithTypes("u64", item.fields.claimed_amount), balance: decodeFromFieldsWithTypes(Balance.reified(typeArg), item.fields.balance), isClosed: decodeFromFieldsWithTypes("bool", item.fields.is_closed), closeInitiatedAt: decodeFromFieldsWithTypes(Option.reified("u64"), item.fields.close_initiated_at), closeInitiatedBy: decodeFromFieldsWithTypes(Option.reified("address"), item.fields.close_initiated_by) } ) }

 static fromBcs<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, data: Uint8Array ): Tunnel<ToPhantomTypeArgument<T0>> { return Tunnel.fromFields( typeArg, Tunnel.bcs.parse(data) ) }

 toJSONField() { return {

 id: this.id,payer: this.payer,creator: this.creator,operator: this.operator,receiverConfigs: fieldToJSON<Vector<ReceiverConfig>>(`vector<${ReceiverConfig.$typeName}>`, this.receiverConfigs),payerPublicKey: fieldToJSON<Vector<"u8">>(`vector<u8>`, this.payerPublicKey),operatorPublicKey: fieldToJSON<Vector<"u8">>(`vector<u8>`, this.operatorPublicKey),credential: fieldToJSON<Vector<"u8">>(`vector<u8>`, this.credential),gracePeriodMs: this.gracePeriodMs.toString(),totalDeposit: this.totalDeposit.toString(),claimedAmount: this.claimedAmount.toString(),balance: this.balance.toJSONField(),isClosed: this.isClosed,closeInitiatedAt: this.closeInitiatedAt.toJSONField(),closeInitiatedBy: this.closeInitiatedBy.toJSONField(),

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, field: any ): Tunnel<ToPhantomTypeArgument<T0>> { return Tunnel.reified( typeArg, ).new( { id: decodeFromJSONField(UID.reified(), field.id), payer: decodeFromJSONField("address", field.payer), creator: decodeFromJSONField("address", field.creator), operator: decodeFromJSONField("address", field.operator), receiverConfigs: decodeFromJSONField(reified.vector(ReceiverConfig.reified()), field.receiverConfigs), payerPublicKey: decodeFromJSONField(reified.vector("u8"), field.payerPublicKey), operatorPublicKey: decodeFromJSONField(reified.vector("u8"), field.operatorPublicKey), credential: decodeFromJSONField(reified.vector("u8"), field.credential), gracePeriodMs: decodeFromJSONField("u64", field.gracePeriodMs), totalDeposit: decodeFromJSONField("u64", field.totalDeposit), claimedAmount: decodeFromJSONField("u64", field.claimedAmount), balance: decodeFromJSONField(Balance.reified(typeArg), field.balance), isClosed: decodeFromJSONField("bool", field.isClosed), closeInitiatedAt: decodeFromJSONField(Option.reified("u64"), field.closeInitiatedAt), closeInitiatedBy: decodeFromJSONField(Option.reified("address"), field.closeInitiatedBy) } ) }

 static fromJSON<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, json: Record<string, any> ): Tunnel<ToPhantomTypeArgument<T0>> { if (json.$typeName !== Tunnel.$typeName) { throw new Error("not a WithTwoGenerics json object") }; assertReifiedTypeArgsMatch( composeIotaType(Tunnel.$typeName, extractType(typeArg)), json.$typeArgs, [typeArg], )

 return Tunnel.fromJSONField( typeArg, json, ) }

 static fromIotaParsedData<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, content: IotaParsedData ): Tunnel<ToPhantomTypeArgument<T0>> { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isTunnel(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a Tunnel object`); } return Tunnel.fromFieldsWithTypes( typeArg, content ); }

 static fromIotaObjectData<T0 extends PhantomReified<PhantomTypeArgument>>( typeArg: T0, data: IotaObjectData ): Tunnel<ToPhantomTypeArgument<T0>> { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isTunnel(data.bcs.type)) { throw new Error(`object at is not a Tunnel object`); }

 const gotTypeArgs = parseTypeName(data.bcs.type).typeArgs; if (gotTypeArgs.length !== 1) { throw new Error(`type argument mismatch: expected 1 type argument but got '${gotTypeArgs.length}'`); }; const gotTypeArg = compressIotaType(gotTypeArgs[0]); const expectedTypeArg = compressIotaType(extractType(typeArg)); if (gotTypeArg !== compressIotaType(extractType(typeArg))) { throw new Error(`type argument mismatch: expected '${expectedTypeArg}' but got '${gotTypeArg}'`); };

 return Tunnel.fromBcs( typeArg, fromB64(data.bcs.bcsBytes) ); } if (data.content) { return Tunnel.fromIotaParsedData( typeArg, data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch<T0 extends PhantomReified<PhantomTypeArgument>>( client: IotaClient, typeArg: T0, id: string ): Promise<Tunnel<ToPhantomTypeArgument<T0>>> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching Tunnel object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isTunnel(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a Tunnel object`); }

 return Tunnel.fromIotaObjectData( typeArg, res.data ); }

 }

/* ============================== TunnelClosed =============================== */

export function isTunnelClosed(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V1}::tunnel::TunnelClosed`; }

export interface TunnelClosedFields { tunnelId: ToField<ID>; payer: ToField<"address">; creator: ToField<"address">; payerRefund: ToField<"u64">; creatorPayout: ToField<"u64">; closedBy: ToField<"address"> }

export type TunnelClosedReified = Reified< TunnelClosed, TunnelClosedFields >;

export class TunnelClosed implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V1}::tunnel::TunnelClosed`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = TunnelClosed.$typeName; readonly $fullTypeName: `${typeof PKG_V1}::tunnel::TunnelClosed`; readonly $typeArgs: []; readonly $isPhantom = TunnelClosed.$isPhantom;

 readonly tunnelId: ToField<ID>; readonly payer: ToField<"address">; readonly creator: ToField<"address">; readonly payerRefund: ToField<"u64">; readonly creatorPayout: ToField<"u64">; readonly closedBy: ToField<"address">

 private constructor(typeArgs: [], fields: TunnelClosedFields, ) { this.$fullTypeName = composeIotaType( TunnelClosed.$typeName, ...typeArgs ) as `${typeof PKG_V1}::tunnel::TunnelClosed`; this.$typeArgs = typeArgs;

 this.tunnelId = fields.tunnelId;; this.payer = fields.payer;; this.creator = fields.creator;; this.payerRefund = fields.payerRefund;; this.creatorPayout = fields.creatorPayout;; this.closedBy = fields.closedBy; }

 static reified( ): TunnelClosedReified { return { typeName: TunnelClosed.$typeName, fullTypeName: composeIotaType( TunnelClosed.$typeName, ...[] ) as `${typeof PKG_V1}::tunnel::TunnelClosed`, typeArgs: [ ] as [], isPhantom: TunnelClosed.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => TunnelClosed.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => TunnelClosed.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => TunnelClosed.fromBcs( data, ), bcs: TunnelClosed.bcs, fromJSONField: (field: any) => TunnelClosed.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => TunnelClosed.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => TunnelClosed.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => TunnelClosed.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => TunnelClosed.fetch( client, id, ), new: ( fields: TunnelClosedFields, ) => { return new TunnelClosed( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return TunnelClosed.reified() }

 static phantom( ): PhantomReified<ToTypeStr<TunnelClosed>> { return phantom(TunnelClosed.reified( )); } static get p() { return TunnelClosed.phantom() }

 static get bcs() { return bcs.struct("TunnelClosed", {

 tunnel_id: ID.bcs, payer: bcs.bytes(32).transform({ input: (val: string) => fromHEX(val), output: (val: Uint8Array) => toHEX(val), }), creator: bcs.bytes(32).transform({ input: (val: string) => fromHEX(val), output: (val: Uint8Array) => toHEX(val), }), payer_refund: bcs.u64(), creator_payout: bcs.u64(), closed_by: bcs.bytes(32).transform({ input: (val: string) => fromHEX(val), output: (val: Uint8Array) => toHEX(val), })

}) };

 static fromFields( fields: Record<string, any> ): TunnelClosed { return TunnelClosed.reified( ).new( { tunnelId: decodeFromFields(ID.reified(), fields.tunnel_id), payer: decodeFromFields("address", fields.payer), creator: decodeFromFields("address", fields.creator), payerRefund: decodeFromFields("u64", fields.payer_refund), creatorPayout: decodeFromFields("u64", fields.creator_payout), closedBy: decodeFromFields("address", fields.closed_by) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): TunnelClosed { if (!isTunnelClosed(item.type)) { throw new Error("not a TunnelClosed type");

 }

 return TunnelClosed.reified( ).new( { tunnelId: decodeFromFieldsWithTypes(ID.reified(), item.fields.tunnel_id), payer: decodeFromFieldsWithTypes("address", item.fields.payer), creator: decodeFromFieldsWithTypes("address", item.fields.creator), payerRefund: decodeFromFieldsWithTypes("u64", item.fields.payer_refund), creatorPayout: decodeFromFieldsWithTypes("u64", item.fields.creator_payout), closedBy: decodeFromFieldsWithTypes("address", item.fields.closed_by) } ) }

 static fromBcs( data: Uint8Array ): TunnelClosed { return TunnelClosed.fromFields( TunnelClosed.bcs.parse(data) ) }

 toJSONField() { return {

 tunnelId: this.tunnelId,payer: this.payer,creator: this.creator,payerRefund: this.payerRefund.toString(),creatorPayout: this.creatorPayout.toString(),closedBy: this.closedBy,

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): TunnelClosed { return TunnelClosed.reified( ).new( { tunnelId: decodeFromJSONField(ID.reified(), field.tunnelId), payer: decodeFromJSONField("address", field.payer), creator: decodeFromJSONField("address", field.creator), payerRefund: decodeFromJSONField("u64", field.payerRefund), creatorPayout: decodeFromJSONField("u64", field.creatorPayout), closedBy: decodeFromJSONField("address", field.closedBy) } ) }

 static fromJSON( json: Record<string, any> ): TunnelClosed { if (json.$typeName !== TunnelClosed.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return TunnelClosed.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): TunnelClosed { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isTunnelClosed(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a TunnelClosed object`); } return TunnelClosed.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): TunnelClosed { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isTunnelClosed(data.bcs.type)) { throw new Error(`object at is not a TunnelClosed object`); }

 return TunnelClosed.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return TunnelClosed.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<TunnelClosed> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching TunnelClosed object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isTunnelClosed(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a TunnelClosed object`); }

 return TunnelClosed.fromIotaObjectData( res.data ); }

 }

/* ============================== TunnelOpened =============================== */

export function isTunnelOpened(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V1}::tunnel::TunnelOpened`; }

export interface TunnelOpenedFields { tunnelId: ToField<ID>; payer: ToField<"address">; creator: ToField<"address">; deposit: ToField<"u64"> }

export type TunnelOpenedReified = Reified< TunnelOpened, TunnelOpenedFields >;

export class TunnelOpened implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V1}::tunnel::TunnelOpened`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = TunnelOpened.$typeName; readonly $fullTypeName: `${typeof PKG_V1}::tunnel::TunnelOpened`; readonly $typeArgs: []; readonly $isPhantom = TunnelOpened.$isPhantom;

 readonly tunnelId: ToField<ID>; readonly payer: ToField<"address">; readonly creator: ToField<"address">; readonly deposit: ToField<"u64">

 private constructor(typeArgs: [], fields: TunnelOpenedFields, ) { this.$fullTypeName = composeIotaType( TunnelOpened.$typeName, ...typeArgs ) as `${typeof PKG_V1}::tunnel::TunnelOpened`; this.$typeArgs = typeArgs;

 this.tunnelId = fields.tunnelId;; this.payer = fields.payer;; this.creator = fields.creator;; this.deposit = fields.deposit; }

 static reified( ): TunnelOpenedReified { return { typeName: TunnelOpened.$typeName, fullTypeName: composeIotaType( TunnelOpened.$typeName, ...[] ) as `${typeof PKG_V1}::tunnel::TunnelOpened`, typeArgs: [ ] as [], isPhantom: TunnelOpened.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => TunnelOpened.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => TunnelOpened.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => TunnelOpened.fromBcs( data, ), bcs: TunnelOpened.bcs, fromJSONField: (field: any) => TunnelOpened.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => TunnelOpened.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => TunnelOpened.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => TunnelOpened.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => TunnelOpened.fetch( client, id, ), new: ( fields: TunnelOpenedFields, ) => { return new TunnelOpened( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return TunnelOpened.reified() }

 static phantom( ): PhantomReified<ToTypeStr<TunnelOpened>> { return phantom(TunnelOpened.reified( )); } static get p() { return TunnelOpened.phantom() }

 static get bcs() { return bcs.struct("TunnelOpened", {

 tunnel_id: ID.bcs, payer: bcs.bytes(32).transform({ input: (val: string) => fromHEX(val), output: (val: Uint8Array) => toHEX(val), }), creator: bcs.bytes(32).transform({ input: (val: string) => fromHEX(val), output: (val: Uint8Array) => toHEX(val), }), deposit: bcs.u64()

}) };

 static fromFields( fields: Record<string, any> ): TunnelOpened { return TunnelOpened.reified( ).new( { tunnelId: decodeFromFields(ID.reified(), fields.tunnel_id), payer: decodeFromFields("address", fields.payer), creator: decodeFromFields("address", fields.creator), deposit: decodeFromFields("u64", fields.deposit) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): TunnelOpened { if (!isTunnelOpened(item.type)) { throw new Error("not a TunnelOpened type");

 }

 return TunnelOpened.reified( ).new( { tunnelId: decodeFromFieldsWithTypes(ID.reified(), item.fields.tunnel_id), payer: decodeFromFieldsWithTypes("address", item.fields.payer), creator: decodeFromFieldsWithTypes("address", item.fields.creator), deposit: decodeFromFieldsWithTypes("u64", item.fields.deposit) } ) }

 static fromBcs( data: Uint8Array ): TunnelOpened { return TunnelOpened.fromFields( TunnelOpened.bcs.parse(data) ) }

 toJSONField() { return {

 tunnelId: this.tunnelId,payer: this.payer,creator: this.creator,deposit: this.deposit.toString(),

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): TunnelOpened { return TunnelOpened.reified( ).new( { tunnelId: decodeFromJSONField(ID.reified(), field.tunnelId), payer: decodeFromJSONField("address", field.payer), creator: decodeFromJSONField("address", field.creator), deposit: decodeFromJSONField("u64", field.deposit) } ) }

 static fromJSON( json: Record<string, any> ): TunnelOpened { if (json.$typeName !== TunnelOpened.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return TunnelOpened.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): TunnelOpened { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isTunnelOpened(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a TunnelOpened object`); } return TunnelOpened.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): TunnelOpened { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isTunnelOpened(data.bcs.type)) { throw new Error(`object at is not a TunnelOpened object`); }

 return TunnelOpened.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return TunnelOpened.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<TunnelOpened> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching TunnelOpened object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isTunnelOpened(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a TunnelOpened object`); }

 return TunnelOpened.fromIotaObjectData( res.data ); }

 }
