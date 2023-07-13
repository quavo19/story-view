import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Modal } from 'react-native';
import {
  GestureHandlerRootView,
  PanGestureHandler,
} from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Metrics } from '../../theme';
import { Footer } from '../Footer';
import { Indicator, ProfileHeader, StoryContainer } from '../StoryView';
import type { StoryRef } from '../StoryView/types';
import { useMultiStoryContainer } from './hooks';
import styles from './styles';
import {
  ListItemProps,
  ListItemRef,
  MultiStoryContainerProps,
  MultiStoryListItemProps,
  TransitionMode,
} from './types';
import {
  cubeTransition,
  defaultTransition,
  scaleTransition,
} from './utils/StoryTransitions';

const MultiStoryListItem = forwardRef<ListItemRef, MultiStoryListItemProps>(
  (
    {
      item,
      index,
      scrollX,
      nextStory,
      previousStory,
      storyIndex,
      onComplete,
      viewedStories,
      isLoading,
      ...props
    }: MultiStoryListItemProps,
    ref
  ) => {
    const storyRef = useRef<StoryRef>(null);
    const storyInitialIndex: number = viewedStories?.[index]?.findIndex(
      (val: boolean) => !val
    );

    useImperativeHandle(ref, () => ({
      onScrollBegin: () => storyRef?.current?.pause(true),
      onScrollEnd: () => storyRef?.current?.pause(false),
      handleLongPress: (visibility: boolean) =>
        storyRef?.current?.handleLongPress(visibility),
    }));

    const animationStyle = useAnimatedStyle(() => {
      switch (props.transitionMode) {
        case TransitionMode.Cube:
          return cubeTransition(index, scrollX);
        case TransitionMode.Scale:
          return scaleTransition(index, scrollX);
        default:
          return defaultTransition();
      }
    }, [index, scrollX.value]);

    return (
      <Animated.View key={item.id} style={styles.itemContainer}>
        {storyIndex === index || isLoading ? (
          <Animated.View style={animationStyle}>
            <StoryContainer
              visible={true}
              key={index + item?.id}
              ref={storyRef}
              userStories={item}
              nextStory={nextStory}
              previousStory={previousStory}
              stories={item.stories}
              progressIndex={storyInitialIndex < 0 ? 0 : storyInitialIndex}
              maxVideoDuration={15}
              renderHeaderComponent={() => (
                <ProfileHeader
                  userImage={{ uri: item.profile ?? '' }}
                  userName={item.username}
                  userMessage={item.title}
                  onClosePress={() => {
                    onComplete?.();
                  }}
                />
              )}
              renderFooterComponent={() => <Footer />}
              {...props}
              index={index}
              userStoryIndex={storyIndex}
            />
          </Animated.View>
        ) : (
          props?.renderIndicatorComponent?.() ?? <Indicator />
        )}
      </Animated.View>
    );
  }
);

const MultiStoryContainer = ({
  stories,
  visible,
  onComplete,
  onUserStoryIndexChange,
  viewedStories = [],
  ...props
}: MultiStoryContainerProps) => {
  const flatListRef = useRef<any>(null);
  const itemsRef = useRef<ListItemRef[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    itemsRef.current = itemsRef.current.slice(0, stories.length);
  }, [itemsRef, stories]);

  const onScrollBeginDrag = () => itemsRef.current[storyIndex]?.onScrollBegin();
  const onScrollEndDrag = () => itemsRef.current[storyIndex]?.onScrollEnd();
  const handleLongPress = (visiblity: boolean) => {
    itemsRef.current[storyIndex]?.handleLongPress(visiblity);
  };

  const {
    storyIndex,
    onViewRef,
    viewabilityConfig,
    gestureHandler,
    listStyle,
    rootStyle,
    onScroll,
    scrollX,
  } = useMultiStoryContainer(
    flatListRef,
    props,
    onScrollBeginDrag,
    onScrollEndDrag,
    handleLongPress,
    onComplete
  );

  useEffect(() => {
    onUserStoryIndexChange?.(storyIndex);
  }, [onUserStoryIndexChange, storyIndex]);

  if (!visible) return null;

  const nextStory = () => {
    if (storyIndex + 1 === stories.length) {
      onComplete?.();
      return;
    }
    if (storyIndex >= stories.length - 1) return;
    flatListRef.current?.scrollToIndex({
      index: storyIndex + 1,
      animated: true,
    });
  };

  const previousStory = () => {
    if (storyIndex === 0) return;
    flatListRef.current?.scrollToIndex({
      index: storyIndex - 1,
      animated: true,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      onRequestClose={() => onComplete?.()}>
      <GestureHandlerRootView style={rootStyle}>
        <PanGestureHandler
          activateAfterLongPress={200}
          onGestureEvent={gestureHandler}>
          <Animated.FlatList
            horizontal
            style={listStyle}
            pagingEnabled
            initialNumToRender={2}
            data={stories}
            ref={flatListRef}
            onScroll={onScroll}
            onScrollBeginDrag={onScrollBeginDrag}
            onScrollEndDrag={onScrollEndDrag}
            scrollEventThrottle={16}
            initialScrollIndex={storyIndex}
            keyboardShouldPersistTaps="handled"
            getItemLayout={(_, index) => ({
              length: Metrics.screenWidth,
              offset: Metrics.screenWidth * index,
              index,
            })}
            onLayout={() => setIsLoading(true)}
            onViewableItemsChanged={onViewRef.current}
            viewabilityConfig={viewabilityConfig.current}
            decelerationRate={Metrics.isIOS ? 0.99 : 0.92}
            keyExtractor={item => item?.title + item?.id?.toString()}
            contentContainerStyle={{
              width: Metrics.screenWidth * stories.length,
            }}
            extraData={storyIndex}
            renderItem={({ item, index }: ListItemProps) => (
              <MultiStoryListItem
                ref={(elements: any) => (itemsRef.current[index] = elements)}
                {...{
                  item,
                  index,
                  nextStory,
                  previousStory,
                  storyIndex,
                  onComplete,
                  viewedStories,
                  scrollX,
                  isLoading,
                }}
                {...props}
              />
            )}
          />
        </PanGestureHandler>
      </GestureHandlerRootView>
    </Modal>
  );
};

export default MultiStoryContainer;
