---
title: "The Relational Model and Schema Design"
category: "Database"
description: "Start from a real workflow and choose tables, relationships, keys, and constraints so data has a clear structure and fewer ways to become inconsistent."
updated: 2026-10-17
translationKey: "database/relational-model-and-data-design"
---

A store needs to keep customers, products, and orders. If we put everything in one table, a customer's name and address repeat on every order; changing the address may require editing many rows. If one large table also contains a list of products, quantities, and prices, we need a way to represent an order with several products. Data design starts by identifying the things and relationships in a workflow, then choosing representations that keep common operations correct.

## From things to relations

In the relational model, data is represented as relations. In SQL, we usually see them as tables: each row is a record and each column is an attribute. This view is useful, but a table is more than a sheet of cells. The database also applies data types, constraints, access rules, and transaction rules to the data.

For the store, we can begin with three kinds of things:

| Thing | Information to keep | Initial representation |
| --- | --- | --- |
| Customer | identifier, name, email | `customers` |
| Order | identifier, customer, time | `orders` |
| Product in an order | product, quantity, price at purchase | `order_items` |

A customer can place many orders. An order contains many products, and a product can appear in many orders. We represent the many-to-many relationship between orders and products with `order_items`; this table also stores facts that belong to a particular purchase, such as quantity and the agreed unit price.

```sql
CREATE TABLE customers (
    customer_id BIGINT PRIMARY KEY,
    email       VARCHAR(320) NOT NULL UNIQUE,
    name        VARCHAR(200) NOT NULL
);

CREATE TABLE orders (
    order_id    BIGINT PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(customer_id),
    created_at  TIMESTAMP NOT NULL
);

CREATE TABLE order_items (
    order_id   BIGINT NOT NULL REFERENCES orders(order_id),
    product_id BIGINT NOT NULL,
    quantity   INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
    PRIMARY KEY (order_id, product_id)
);
```

This is an illustrative model. A production schema must also decide how to represent currency, whether a product may appear more than once in an order, product lifecycle, order deletion, access control, and change history.

## Keys identify and connect data

A **primary key** uniquely identifies a row. It can be one column such as `order_id`, or several columns such as `(order_id, product_id)`. A key should remain stable throughout a record's lifetime; email is often a poor primary key because people can change it.

A **foreign key** represents a relationship to another table and lets the database reject invalid references. With the constraint enabled, `orders.customer_id` cannot point to a customer that does not exist. A foreign key protects an invariant in the database, but it does not choose the business policy for deletion: we must decide whether to reject the delete, cascade it, or preserve the historical record.

A unique value does not have to be the primary key. `email` can have a `UNIQUE` constraint while the record uses `customer_id` as its internal identifier. `NOT NULL`, `CHECK`, `UNIQUE`, primary-key, and foreign-key constraints express different rules. Choose the rule that matches the invariant instead of checking everything only in application code.

## Choose columns and types by meaning

A data type describes meaning and limits the values that can be stored. Use integer types for counts, exact decimal types for money, timestamps with an explicit time-zone convention for moments in time, and text types sized for the expected strings. Do not choose a type only because a short example happens to work.

Database products differ in their types, casts, collations, and handling of `NULL`. A `NULL` column represents an absent or unknown value according to the schema's design; it is not an empty string, and ordinary comparisons with `NULL` do not behave like numeric comparisons. Before choosing a product-specific type, consult the documentation for the target version, such as [PostgreSQL data types](https://www.postgresql.org/docs/current/datatype.html) and [MySQL 8.4 data types](https://dev.mysql.com/doc/refman/8.4/en/data-types.html).

## Normalize so each fact has an appropriate home

If a customer's address is copied into every order, changing the address requires editing many rows. If one edit is missed, one fact now has two values. This is an **update anomaly**. Repeated data can also make it impossible to add a product before it has an order (**insertion anomaly**) or cause product information to disappear when its last order is deleted (**deletion anomaly**).

Normalization analyzes which attributes depend on which things, then places them in the appropriate relations. In our example, the customer's name depends on `customer_id`, while the quantity and purchase-time price depend on `(order_id, product_id)`. Putting attributes in the right tables reduces duplication and makes consistency rules clearer.

Normalization does not mean splitting every column into its own table. The goal is to preserve meaning and avoid anomalies caused by the wrong dependencies. Joins have a cost; after measurement identifies a bottleneck, some values may be stored redundantly on purpose to accelerate a specific read path. This is **denormalization**: we accept responsibility for synchronization in exchange for a targeted read benefit. Every copy needs a defined source of truth and a process to update it, rebuild it, or detect drift.

For example, `orders.total_amount` can be derived from `order_items`. If we store it for faster reads, the application must update the total in the same transaction as the line items, or provide a reconciliation mechanism. A stored total without an update rule turns an optimization into a source of inconsistency.

## A schema is a data contract

A schema defines which data is valid, how entities connect, and which rules the database protects. A sound design starts with the questions the application needs to answer, while also considering concurrent updates, history, deletion, imports, and future schema changes.

Before settling the design, test it with concrete questions:

- Can a customer have several email addresses, or can one address belong to several accounts?
- Should deleting a product remove the history of orders that already included it?
- Can two concurrent requests create rows with the same business key?
- Is an order's price the product's current price or the price agreed at purchase time?
- If a column or rule changes, can the running application read both old and new schemas during the transition?

The answers determine keys, constraints, relationships, and migrations. They also provide the foundation for later notes on transactions, indexes, and query planning.

## Check your understanding

**Why is `unit_price` in `order_items` instead of always being read from `products`?** An order must preserve the price at purchase time. The product's current price may change later.

**Can `UNIQUE(email)` replace a primary key?** It can serve as a candidate key if the business rule guarantees uniqueness and stability. Many systems still use a separate identifier so relationships do not depend on an email address that may change.

**Does normalization always make queries faster?** No. It usually reduces duplication and update anomalies, but a query may need more joins. Read optimization should be based on the workload and measured data.

Foundational reading: *High Performance MySQL*, chapter 4; *PostgreSQL 14 Internals*, the introduction on databases, relations, schemas, and data types.
