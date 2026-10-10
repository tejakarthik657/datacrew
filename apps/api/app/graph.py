"""Neo4j Graph Database Adapter for Data Lineage, Entity Provenance, and Agent Execution DAG.

Connects to Neo4j AuraDB or local Neo4j instances using Bolt protocol / Cypher queries.
Gracefully handles connection state and falls back when Neo4j is offline or credentials are omitted.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from .config import settings

logger = logging.getLogger("datacrew.graph")


class Neo4jGraphAdapter:
    """Manager for Neo4j graph operations, nodes, and relationships."""

    def __init__(self) -> None:
        self.uri = settings.neo4j_uri
        self.username = settings.neo4j_username
        self.password = settings.neo4j_password
        self.database = settings.neo4j_database
        self._driver = None

    def _get_driver(self):
        if self._driver is not None:
            return self._driver
        if not self.uri or not self.password:
            return None
        try:
            from neo4j import GraphDatabase
            self._driver = GraphDatabase.driver(
                self.uri,
                auth=(self.username, self.password)
            )
            return self._driver
        except Exception as e:
            logger.warning(f"Failed to initialize Neo4j driver: {e}")
            return None

    def is_connected(self) -> bool:
        """Check if Neo4j database connection is active."""
        if not self.uri or not self.password:
            return False
        driver = self._get_driver()
        if not driver:
            return False
        try:
            driver.verify_connectivity()
            return True
        except Exception as e:
            logger.debug(f"Neo4j connectivity check failed: {e}")
            return False

    def sync_dataset_nodes(
        self,
        dataset_id: str,
        dataset_name: str,
        workspace_id: str,
        versions: List[Dict[str, Any]]
    ) -> bool:
        """Project dataset and version lineage nodes & relationships into Neo4j graph."""
        driver = self._get_driver()
        if not driver:
            return False

        cypher_query = """
        MERGE (d:Dataset {id: $dataset_id})
        ON CREATE SET d.name = $dataset_name, d.workspace_id = $workspace_id, d.created_at = datetime()
        ON MATCH SET d.name = $dataset_name

        WITH d
        UNWIND $versions AS v
        MERGE (ver:DatasetVersion {id: $dataset_id + '_v' + toString(v.number)})
        SET ver.number = v.number,
            ver.rows = v.rows,
            ver.score = v.score,
            ver.label = v.label,
            ver.storage_key = v.storage_key,
            ver.dataset_id = $dataset_id

        MERGE (d)-[:HAS_VERSION]->(ver)
        """

        try:
            with driver.session(database=self.database) as session:
                session.run(
                    cypher_query,
                    dataset_id=dataset_id,
                    dataset_name=dataset_name,
                    workspace_id=workspace_id,
                    versions=versions
                )
                
                # Link sequential versions with DERIVED_FROM edges
                link_cypher = """
                MATCH (d:Dataset {id: $dataset_id})-[:HAS_VERSION]->(v:DatasetVersion)
                WITH v ORDER BY v.number ASC
                WITH collect(v) AS ver_list
                UNWIND range(0, size(ver_list)-2) AS idx
                WITH ver_list[idx] AS v_prev, ver_list[idx+1] AS v_next
                MERGE (v_next)-[r:TRANSFORMED_FROM]->(v_prev)
                """
                session.run(link_cypher, dataset_id=dataset_id)
            return True
        except Exception as e:
            logger.error(f"Error syncing dataset nodes to Neo4j: {e}")
            return False

    def query_lineage_graph(self, dataset_id: str) -> Optional[Dict[str, Any]]:
        """Fetch lineage DAG from Neo4j graph for a given dataset."""
        driver = self._get_driver()
        if not driver:
            return None

        cypher = """
        MATCH (d:Dataset {id: $dataset_id})
        OPTIONAL MATCH (d)-[:HAS_VERSION]->(v:DatasetVersion)
        OPTIONAL MATCH (v)-[r:TRANSFORMED_FROM]->(v_prev:DatasetVersion)
        RETURN d, collect(DISTINCT v) as versions, collect(DISTINCT {from: v.id, to: v_prev.id, label: 'transformed_from'}) as relationships
        """

        try:
            with driver.session(database=self.database) as session:
                result = session.run(cypher, dataset_id=dataset_id).single()
                if not result or not result["d"]:
                    return None

                d_node = dict(result["d"])
                versions = [dict(v) for v in result["versions"] if v]

                nodes = [{
                    "id": f"dataset_{d_node['id']}",
                    "type": "source",
                    "label": f"Dataset: {d_node.get('name', dataset_id)}",
                    "subtitle": f"Neo4j Graph Node ({len(versions)} versions)",
                    "status": "active",
                    "engine": "neo4j"
                }]

                edges = []
                for v in sorted(versions, key=lambda x: x.get("number", 0)):
                    v_id = f"version_v{v.get('number', 0)}"
                    nodes.append({
                        "id": v_id,
                        "type": "version",
                        "label": f"Version v{v.get('number', 0)}",
                        "subtitle": f"{v.get('rows', 0)} rows • Quality Score: {v.get('score', 0)}%",
                        "status": "active",
                        "engine": "neo4j",
                        "meta": v
                    })
                    edges.append({
                        "from": f"dataset_{d_node['id']}",
                        "to": v_id,
                        "label": "has_version"
                    })

                return {
                    "engine": "neo4j",
                    "dataset_id": dataset_id,
                    "dataset_name": d_node.get("name", dataset_id),
                    "nodes": nodes,
                    "edges": edges
                }
        except Exception as e:
            logger.error(f"Failed to query lineage graph from Neo4j: {e}")
            return None

    def close(self):
        if self._driver is not None:
            try:
                self._driver.close()
            except Exception:
                pass
            self._driver = None


graph_adapter = Neo4jGraphAdapter()
