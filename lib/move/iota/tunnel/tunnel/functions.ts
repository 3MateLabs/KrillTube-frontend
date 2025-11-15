import {PUBLISHED_AT} from "..";
import {String} from "../../_dependencies/onchain/0x1/string/structs";
import {obj, pure, vector} from "../../_framework/util";
import {ReceiverConfig} from "./structs";
import {Transaction, TransactionArgument, TransactionObjectInput} from "@iota/iota-sdk/transactions";

export interface ClaimArgs { a0: TransactionObjectInput; a1: bigint | TransactionArgument; a2: bigint | TransactionArgument; a3: Array<number | TransactionArgument> | TransactionArgument }

export function claim( tx: Transaction, typeArg: string, args: ClaimArgs ) { return tx.moveCall({ target: `${PUBLISHED_AT}::tunnel::claim`, typeArguments: [typeArg], arguments: [ obj(tx, args.a0), pure(tx, args.a1, `u64`), pure(tx, args.a2, `u64`), pure(tx, args.a3, `vector<u8>`) ], }) }

export function claimedAmount( tx: Transaction, typeArg: string, a0: TransactionObjectInput ) { return tx.moveCall({ target: `${PUBLISHED_AT}::tunnel::claimed_amount`, typeArguments: [typeArg], arguments: [ obj(tx, a0) ], }) }

export interface CloseWithReceiptArgs { a0: TransactionObjectInput; a1: TransactionObjectInput }

export function closeWithReceipt( tx: Transaction, typeArg: string, args: CloseWithReceiptArgs ) { return tx.moveCall({ target: `${PUBLISHED_AT}::tunnel::close_with_receipt`, typeArguments: [typeArg], arguments: [ obj(tx, args.a0), obj(tx, args.a1) ], }) }

export interface CreateCreatorConfigArgs { a0: string | TransactionArgument; a1: Array<number | TransactionArgument> | TransactionArgument; a2: string | TransactionArgument; a3: Array<TransactionObjectInput> | TransactionArgument; a4: bigint | TransactionArgument }

export function createCreatorConfig( tx: Transaction, args: CreateCreatorConfigArgs ) { return tx.moveCall({ target: `${PUBLISHED_AT}::tunnel::create_creator_config`, arguments: [ pure(tx, args.a0, `address`), pure(tx, args.a1, `vector<u8>`), pure(tx, args.a2, `${String.$typeName}`), vector(tx, `${ReceiverConfig.$typeName}`, args.a3), pure(tx, args.a4, `u64`) ], }) }

export interface CreateReceiverConfigArgs { a0: bigint | TransactionArgument; a1: string | TransactionArgument; a2: bigint | TransactionArgument }

export function createReceiverConfig( tx: Transaction, args: CreateReceiverConfigArgs ) { return tx.moveCall({ target: `${PUBLISHED_AT}::tunnel::create_receiver_config`, arguments: [ pure(tx, args.a0, `u64`), pure(tx, args.a1, `address`), pure(tx, args.a2, `u64`) ], }) }

export function creator( tx: Transaction, typeArg: string, a0: TransactionObjectInput ) { return tx.moveCall({ target: `${PUBLISHED_AT}::tunnel::creator`, typeArguments: [typeArg], arguments: [ obj(tx, a0) ], }) }

export function creatorConfigCreator( tx: Transaction, a0: TransactionObjectInput ) { return tx.moveCall({ target: `${PUBLISHED_AT}::tunnel::creator_config_creator`, arguments: [ obj(tx, a0) ], }) }

export function creatorConfigMetadata( tx: Transaction, a0: TransactionObjectInput ) { return tx.moveCall({ target: `${PUBLISHED_AT}::tunnel::creator_config_metadata`, arguments: [ obj(tx, a0) ], }) }

export function creatorConfigOperatorPublicKey( tx: Transaction, a0: TransactionObjectInput ) { return tx.moveCall({ target: `${PUBLISHED_AT}::tunnel::creator_config_operator_public_key`, arguments: [ obj(tx, a0) ], }) }

export interface FinalizeCloseArgs { a0: TransactionObjectInput; a1: TransactionObjectInput }

export function finalizeClose( tx: Transaction, typeArg: string, args: FinalizeCloseArgs ) { return tx.moveCall({ target: `${PUBLISHED_AT}::tunnel::finalize_close`, typeArguments: [typeArg], arguments: [ obj(tx, args.a0), obj(tx, args.a1) ], }) }

export interface InitCloseArgs { a0: TransactionObjectInput; a1: TransactionObjectInput }

export function initClose( tx: Transaction, typeArg: string, args: InitCloseArgs ) { return tx.moveCall({ target: `${PUBLISHED_AT}::tunnel::init_close`, typeArguments: [typeArg], arguments: [ obj(tx, args.a0), obj(tx, args.a1) ], }) }

export function isClosed( tx: Transaction, typeArg: string, a0: TransactionObjectInput ) { return tx.moveCall({ target: `${PUBLISHED_AT}::tunnel::is_closed`, typeArguments: [typeArg], arguments: [ obj(tx, a0) ], }) }

export interface OpenTunnelArgs { a0: TransactionObjectInput; a1: Array<number | TransactionArgument> | TransactionArgument; a2: Array<number | TransactionArgument> | TransactionArgument; a3: string | TransactionArgument; a4: TransactionObjectInput }

export function openTunnel( tx: Transaction, typeArg: string, args: OpenTunnelArgs ) { return tx.moveCall({ target: `${PUBLISHED_AT}::tunnel::open_tunnel`, typeArguments: [typeArg], arguments: [ obj(tx, args.a0), pure(tx, args.a1, `vector<u8>`), pure(tx, args.a2, `vector<u8>`), pure(tx, args.a3, `address`), obj(tx, args.a4) ], }) }

export function payer( tx: Transaction, typeArg: string, a0: TransactionObjectInput ) { return tx.moveCall({ target: `${PUBLISHED_AT}::tunnel::payer`, typeArguments: [typeArg], arguments: [ obj(tx, a0) ], }) }

export interface ProcessPaymentArgs { a0: TransactionObjectInput; a1: string | TransactionArgument; a2: TransactionObjectInput; a3: TransactionObjectInput }

export function processPayment( tx: Transaction, typeArg: string, args: ProcessPaymentArgs ) { return tx.moveCall({ target: `${PUBLISHED_AT}::tunnel::process_payment`, typeArguments: [typeArg], arguments: [ obj(tx, args.a0), pure(tx, args.a1, `address`), obj(tx, args.a2), obj(tx, args.a3) ], }) }

export function remainingBalance( tx: Transaction, typeArg: string, a0: TransactionObjectInput ) { return tx.moveCall({ target: `${PUBLISHED_AT}::tunnel::remaining_balance`, typeArguments: [typeArg], arguments: [ obj(tx, a0) ], }) }

export function totalDeposit( tx: Transaction, typeArg: string, a0: TransactionObjectInput ) { return tx.moveCall({ target: `${PUBLISHED_AT}::tunnel::total_deposit`, typeArguments: [typeArg], arguments: [ obj(tx, a0) ], }) }

export function tunnelId( tx: Transaction, typeArg: string, a0: TransactionObjectInput ) { return tx.moveCall({ target: `${PUBLISHED_AT}::tunnel::tunnel_id`, typeArguments: [typeArg], arguments: [ obj(tx, a0) ], }) }
