#!/usr/bin/env python3
"""
Mem0 CLI - Command-Line Interface for OneSight Agent Memory
Usage:
  python mem0/cli.py status
  python mem0/cli.py list [--category CAT] [--tenant TENANT]
  python mem0/cli.py search "query" [--limit N]
  python mem0/cli.py add "statement" [--type TYPE] [--category CAT]
  python mem0/cli.py delete <ID>
  python mem0/cli.py clear
"""

import sys
import os
import json
import argparse
import httpx

API_URL = os.getenv("MEM0_URL", "http://localhost:8888").rstrip("/")

def is_server_online() -> bool:
    try:
        r = httpx.get(f"{API_URL}/health", timeout=1.0)
        return r.status_code == 200
    except Exception:
        return False

def cmd_status(args):
    print("=" * 60)
    print(" 🧠 Mem0 Agent Memory - Status")
    print("=" * 60)
    online = is_server_online()
    if online:
        try:
            r = httpx.get(f"{API_URL}/health", timeout=2.0).json()
            print(f"Status:            🟢 ONLINE (Standalone Service)")
            print(f"Endpoint:          {API_URL}")
            print(f"Ollama Endpoint:   {r.get('ollama_endpoint')}")
            print(f"Database File:     {r.get('database')}")
        except Exception as e:
            print(f"Status:            🟡 Error reading status: {e}")
    else:
        print(f"Status:            ⚪ OFFLINE (Operating in direct local DB mode)")
        print(f"Endpoint:          {API_URL} (Container not running)")

    # Count memories
    try:
        memories = get_memories(args.tenant)
        print(f"Total Memories:    {len(memories)} (Tenant: {args.tenant})")
    except Exception as e:
        print(f"Memory count:      Error: {e}")
    print("=" * 60)

def get_memories(tenant: str = "tenant-acme", category: str = None):
    if is_server_online():
        url = f"{API_URL}/v1/memories?tenant_id={tenant}"
        if category and category.upper() != "ALL":
            url += f"&category={category.upper()}"
        r = httpx.get(url, timeout=3.0)
        return r.json()
    else:
        # Direct local fallback
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import server
        return server.list_memories(tenant_id=tenant, category=category)

def cmd_list(args):
    memories = get_memories(args.tenant, args.category)
    print(f"\n📋 Mem0 Stored Memories ({len(memories)}) [Tenant: {args.tenant}]:")
    print("-" * 75)
    if not memories:
        print("  (No memories found for this filter)")
        return
    for m in memories:
        print(f"  [#{m['id']}] [{m['memory_type']}] ({m['category']})")
        print(f"       Content:  {m['content']}")
        print(f"       Provider: {m.get('embedding_provider', 'hybrid-cpu-dense')}")
        if m.get("created_at"):
            print(f"       Created:  {m['created_at']}")
        print("-" * 75)

def cmd_search(args):
    query = args.query
    print(f"\n🔍 Searching Mem0 for: '{query}'...")
    if is_server_online():
        r = httpx.post(f"{API_URL}/v1/memories/search", json={
            "query": query, "tenant_id": args.tenant, "limit": args.limit
        }, timeout=5.0)
        hits = r.json()
    else:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import server
        hits = server.search_memories(server.MemorySearch(
            query=query, tenant_id=args.tenant, limit=args.limit
        ))

    print(f"Found {len(hits)} matching memory record(s):")
    print("-" * 75)
    for h in hits:
        print(f"  Score: {h['score']:.3f} | [#{h['id']}] [{h['memory_type']}] ({h['category']})")
        print(f"  {h['content']}")
        print("-" * 75)

def cmd_add(args):
    content = args.content
    print(f"\n➕ Adding memory: '{content}'...")
    payload = {
        "content": content,
        "tenant_id": args.tenant,
        "memory_type": args.type,
        "category": args.category,
        "metadata": {}
    }
    if is_server_online():
        r = httpx.post(f"{API_URL}/v1/memories", json=payload, timeout=5.0)
        res = r.json()
    else:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import server
        res = server.create_memory(server.MemoryCreate(**payload))

    print(f"✅ Memory saved successfully! ID: #{res['id']} (Provider: {res['embedding_provider']})")

def cmd_delete(args):
    mem_id = args.id
    if is_server_online():
        r = httpx.delete(f"{API_URL}/v1/memories/{mem_id}?tenant_id={args.tenant}", timeout=3.0)
        if r.status_code == 200:
            print(f"🗑️ Deleted memory #{mem_id} successfully.")
        else:
            print(f"❌ Failed to delete memory #{mem_id}: {r.text}")
    else:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import server
        try:
            server.delete_memory(mem_id, tenant_id=args.tenant)
            print(f"🗑️ Deleted memory #{mem_id} successfully.")
        except Exception as e:
            print(f"❌ Error deleting memory: {e}")

def cmd_clear(args):
    confirm = input(f"Are you sure you want to clear ALL memories for tenant '{args.tenant}'? (y/N): ")
    if confirm.lower() != "y":
        print("Aborted.")
        return
    if is_server_online():
        r = httpx.post(f"{API_URL}/v1/memories/clear?tenant_id={args.tenant}", timeout=3.0)
        print(f"🧹 Cleared {r.json().get('deleted_count', 0)} memories.")
    else:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import server
        res = server.clear_memories(tenant_id=args.tenant)
        print(f"🧹 Cleared {res.get('deleted_count', 0)} memories.")

def main():
    parser = argparse.ArgumentParser(description="Mem0 Agent Memory CLI for OneSight")
    parser.add_argument("--tenant", default="tenant-acme", help="Tenant ID (default: tenant-acme)")
    subparsers = parser.add_subparsers(dest="command", help="Available subcommands")

    # status
    sub = subparsers.add_parser("status", help="Show Mem0 service health and statistics")
    sub.set_defaults(func=cmd_status)

    # list
    sub = subparsers.add_parser("list", help="List stored memories")
    sub.add_argument("--category", default=None, help="Category filter (e.g. IDLE_WASTE, BUDGET, EC2)")
    sub.set_defaults(func=cmd_list)

    # search
    sub = subparsers.add_parser("search", help="Semantic vector search")
    sub.add_argument("query", help="Query string")
    sub.add_argument("--limit", type=int, default=5, help="Max results (default: 5)")
    sub.set_defaults(func=cmd_search)

    # add
    sub = subparsers.add_parser("add", help="Add a new rule or memory")
    sub.add_argument("content", help="Memory statement or policy")
    sub.add_argument("--type", default="FINOPS_RULE", choices=["FINOPS_RULE", "RESOURCE_EXEMPTION", "USER_PREFERENCE", "ANOMALY_NOTE"])
    sub.add_argument("--category", default="GENERAL", choices=["GENERAL", "IDLE_WASTE", "BUDGET", "EC2", "S3", "RDS"])
    sub.set_defaults(func=cmd_add)

    # delete
    sub = subparsers.add_parser("delete", help="Delete a memory by ID")
    sub.add_argument("id", type=int, help="Memory ID")
    sub.set_defaults(func=cmd_delete)

    # clear
    sub = subparsers.add_parser("clear", help="Clear all memories for tenant")
    sub.set_defaults(func=cmd_clear)

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(0)

    args.func(args)

if __name__ == "__main__":
    main()
