package com.kietnewshub.news;

import java.util.Locale;

public class ArticleAvlIndex {
    private Node root;

    public synchronized void put(String title, String articleId) {
        root = insert(root, title.toLowerCase(Locale.ROOT), articleId);
    }

    public synchronized String find(String title) {
        Node current = root;
        String key = title.toLowerCase(Locale.ROOT);
        while (current != null) {
            int comparison = key.compareTo(current.key);
            if (comparison == 0) return current.articleId;
            current = comparison < 0 ? current.left : current.right;
        }
        return null;
    }

    private Node insert(Node node, String key, String articleId) {
        if (node == null) return new Node(key, articleId);
        int comparison = key.compareTo(node.key);
        if (comparison < 0) node.left = insert(node.left, key, articleId);
        else if (comparison > 0) node.right = insert(node.right, key, articleId);
        else node.articleId = articleId;
        updateHeight(node);
        return rebalance(node);
    }

    private Node rebalance(Node node) {
        int balance = height(node.left) - height(node.right);
        if (balance > 1) {
            if (height(node.left.left) < height(node.left.right)) node.left = rotateLeft(node.left);
            return rotateRight(node);
        }
        if (balance < -1) {
            if (height(node.right.right) < height(node.right.left)) node.right = rotateRight(node.right);
            return rotateLeft(node);
        }
        return node;
    }

    private Node rotateLeft(Node node) {
        Node pivot = node.right;
        node.right = pivot.left;
        pivot.left = node;
        updateHeight(node);
        updateHeight(pivot);
        return pivot;
    }

    private Node rotateRight(Node node) {
        Node pivot = node.left;
        node.left = pivot.right;
        pivot.right = node;
        updateHeight(node);
        updateHeight(pivot);
        return pivot;
    }

    private void updateHeight(Node node) {
        node.height = 1 + Math.max(height(node.left), height(node.right));
    }

    private int height(Node node) {
        return node == null ? 0 : node.height;
    }

    private static class Node {
        private final String key;
        private String articleId;
        private int height = 1;
        private Node left;
        private Node right;

        private Node(String key, String articleId) {
            this.key = key;
            this.articleId = articleId;
        }
    }
}