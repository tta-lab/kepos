import { useState } from 'react'
import type { StyleProp, TextStyle, ViewStyle } from 'react-native'
import { FlatList, Text, TextInput, View } from 'react-native'
import { Heart, MessageCircle } from 'lucide-react-native'
import { createMobileTreeholeAuthorAvatar } from '../src/mobile-avatar-view-model.ts'
import { displayPostAuthor, formatMobilePostTime } from '../src/mobile-product-copy.ts'
import { createTextComposerState } from '../src/text-composer-state.ts'
import {
  MobileSendButton,
  MobileSmallActionButton,
  type MobileSendButtonStyles,
  type MobileSmallActionButtonStyles
} from './action-components.tsx'
import { EmptyTreehole, type EmptyStateStyles, type EmptyStateTheme } from './empty-components.tsx'
import { PaneLabel, type PaneLabelProps } from './panel-components.tsx'
import { MobileProfileAvatar, type MobileProfileAvatarStyles } from './profile-components.tsx'

export type TreeholePaneStyles = EmptyStateStyles &
  TreeholePostStyles &
  MobileSendButtonStyles &
  PaneLabelProps['styles'] & {
    disabledTreeholeInput: StyleProp<TextStyle>
    treeholeComposer: StyleProp<ViewStyle>
    treeholeComposerFields: StyleProp<ViewStyle>
    treeholeInput: StyleProp<TextStyle>
    treeholeList: StyleProp<ViewStyle>
  }

export type TreeholePaneTheme = EmptyStateTheme & TreeholePostTheme

export type TreeholePaneProps = {
  canInteract: boolean
  canPost: boolean
  draft: string
  onComment(comment: { postId: string; text: string }): void
  onDraftChange(value: string): void
  onLike(postId: string): void
  onPost(): void
  posts: TreeholePostInput[]
  status?: string
  styles: TreeholePaneStyles
  theme: TreeholePaneTheme
}

export function TreeholePane({
  canInteract,
  canPost,
  draft,
  onComment,
  onDraftChange,
  onLike,
  onPost,
  posts,
  status,
  styles,
  theme
}: TreeholePaneProps) {
  const postComposerState = createTextComposerState({ draft, enabled: canPost })
  const showOwnerOnlyHint = status === 'ready' && !canPost

  return (
    <>
      <PaneLabel eyebrow='durable' styles={styles} title='Treehole' />
      <FlatList
        contentContainerStyle={styles.treeholeList}
        data={posts}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <EmptyTreehole canPost={canPost} status={status} styles={styles} theme={theme} />
        }
        renderItem={({ item }) => (
          <TreeholePost
            canInteract={canInteract}
            onComment={onComment}
            onLike={onLike}
            post={item}
            styles={styles}
            theme={theme}
          />
        )}
      />

      <View style={styles.treeholeComposer}>
        <View style={styles.treeholeComposerFields}>
          <TextInput
            editable={canPost}
            multiline
            onChangeText={onDraftChange}
            placeholder='Post to Treehole'
            placeholderTextColor={theme.placeholder}
            style={[styles.treeholeInput, !canPost && styles.disabledTreeholeInput]}
            testID='treehole-post-input'
            value={draft}
          />
          {showOwnerOnlyHint ? (
            <Text style={styles.composerHint}>Only the owner can post here.</Text>
          ) : null}
        </View>
        <MobileSendButton
          accessibilityLabel='Post to Treehole'
          disabled={!postComposerState.canSubmit}
          onPress={onPost}
          styles={styles}
          surfaceColor={theme.surface}
          testID='treehole-post-button'
        />
      </View>
    </>
  )
}

export function TreeholePost({
  canInteract,
  onComment,
  onLike,
  post,
  styles,
  theme
}: TreeholePostProps) {
  const [commentDraft, setCommentDraft] = useState('')
  const commentComposerState = createTextComposerState({
    draft: commentDraft,
    enabled: canInteract
  })
  const postAvatar = createMobileTreeholeAuthorAvatar(post)

  function submitComment() {
    if (!commentComposerState.canSubmit) {
      return
    }

    onComment({ postId: post.id, text: commentComposerState.text })
    setCommentDraft('')
  }

  return (
    <View style={styles.post}>
      <View style={styles.postHeader}>
        <View style={styles.treeholeAuthorRow}>
          <MobileProfileAvatar avatar={postAvatar} styles={styles} />
          <Text style={styles.postAuthor}>{displayPostAuthor(post)}</Text>
        </View>
        <Text style={styles.postTime}>{formatMobilePostTime(post.createdAt)}</Text>
      </View>
      <Text style={styles.postText}>{post.text}</Text>
      <View style={styles.commentList}>
        {(post.comments || []).map((comment) => {
          const commentAvatar = createMobileTreeholeAuthorAvatar(comment)

          return (
            <View key={comment.id} style={styles.comment}>
              <View style={styles.commentAuthorRow}>
                <MobileProfileAvatar avatar={commentAvatar} size='small' styles={styles} />
                <Text style={styles.commentAuthor}>{displayPostAuthor(comment)}</Text>
              </View>
              <Text style={styles.commentText}>{comment.text}</Text>
            </View>
          )
        })}
      </View>
      <View style={styles.postStats}>
        <View style={styles.postStat}>
          <MessageCircle color={theme.inkSoft} size={14} />
          <Text style={styles.postStatText}>{post.commentCount}</Text>
        </View>
        <View style={styles.postStat}>
          <Heart color={theme.inkSoft} size={14} />
          <Text style={styles.postStatText}>{post.likeCount}</Text>
        </View>
      </View>
      <View style={styles.postActions}>
        <MobileSmallActionButton
          accessibilityLabel='Like post'
          accentColor={theme.accentStrong}
          dangerColor={theme.danger}
          styles={styles}
          disabled={!canInteract}
          icon={Heart}
          label='Like'
          onPress={() => onLike(post.id)}
        />
        {!canInteract ? (
          <Text style={styles.composerHint}>Only trusted friends can comment or like here.</Text>
        ) : null}
        <View style={styles.commentComposer}>
          <TextInput
            editable={canInteract}
            onChangeText={setCommentDraft}
            onSubmitEditing={submitComment}
            placeholder='Write a comment'
            placeholderTextColor={theme.placeholder}
            style={[styles.commentInput, !canInteract && styles.disabledTreeholeInput]}
            value={commentDraft}
          />
          <MobileSendButton
            accessibilityLabel='Send comment'
            disabled={!commentComposerState.canSubmit}
            onPress={submitComment}
            size='small'
            styles={styles}
            surfaceColor={theme.surface}
          />
        </View>
      </View>
    </View>
  )
}

export type TreeholePostInput = {
  author?: string | null
  authorDisplayName?: string | null
  authorProfileId?: string | null
  commentCount?: number
  comments?: TreeholeCommentInput[]
  createdAt: number | string | Date
  id: string
  likeCount?: number
  text?: string
}

export type TreeholeCommentInput = {
  author?: string | null
  authorDisplayName?: string | null
  authorProfileId?: string | null
  id: string
  text?: string
}

export type TreeholePostStyles = MobileProfileAvatarStyles &
  MobileSendButtonStyles &
  MobileSmallActionButtonStyles & {
    comment: StyleProp<ViewStyle>
    commentAuthor: StyleProp<TextStyle>
    commentAuthorRow: StyleProp<ViewStyle>
    commentComposer: StyleProp<ViewStyle>
    commentInput: StyleProp<TextStyle>
    commentList: StyleProp<ViewStyle>
    commentText: StyleProp<TextStyle>
    composerHint: StyleProp<TextStyle>
    disabledTreeholeInput: StyleProp<TextStyle>
    post: StyleProp<ViewStyle>
    postActions: StyleProp<ViewStyle>
    postAuthor: StyleProp<TextStyle>
    postHeader: StyleProp<ViewStyle>
    postStat: StyleProp<ViewStyle>
    postStatText: StyleProp<TextStyle>
    postStats: StyleProp<ViewStyle>
    postText: StyleProp<TextStyle>
    postTime: StyleProp<TextStyle>
    treeholeAuthorRow: StyleProp<ViewStyle>
  }

export type TreeholePostTheme = {
  accentStrong: string
  danger: string
  inkSoft: string
  placeholder: string
  surface: string
}

export type TreeholePostProps = {
  canInteract: boolean
  onComment(comment: { postId: string; text: string }): void
  onLike(postId: string): void
  post: TreeholePostInput
  styles: TreeholePostStyles
  theme: TreeholePostTheme
}
