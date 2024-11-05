import { View, Text, Image } from "react-native";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Tabs, useNavigation } from "expo-router";
import { icons } from "../../constants";

// Mocking a role context, replace with actual context or prop
const UserRoleContext = createContext("Family"); // e.g., "Family" or "Nurse"

const TabIcon = ({ icon, color, name, focused }) => (
  <View className="items-center justify-center gap-2">
    <Image
      source={icon}
      resizeMode="contain"
      tintColor={color}
      className="w-6 h-6"
    />
    <Text
      className={`${
        focused ? "font-psemibold" : "font-pregular"
      } text-xs text-white`}
    >
      {name}
    </Text>
  </View>
);

const CustomTabsLayout = ({ role }) => {
  const [showTabBar, setShowTabBar] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    // Hide tab bar for Nurse role or specific conditions
    const shouldHideTabBar = role === "Nurse"; // Example condition for Nurse role
    setShowTabBar(!shouldHideTabBar);
  }, [role]);

  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#FF0000",
        tabBarInactiveTintColor: "#CDCDE0",
        tabBarStyle: showTabBar
          ? {
              backgroundColor: "#adadad",
              borderTopWidth: 1,
              borderTopColor: "#CDCDE0",
              height: 60,
            }
          : { display: "none" }, // Fully hide tab bar if needed
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={icons.home}
              color={color}
              name="Home"
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={icons.profile}
              color={color}
              name="Profile"
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
};

const TabsLayout = () => {
  const role = useContext(UserRoleContext); // Replace with actual role retrieval

  return <CustomTabsLayout role={role} />;
};

export default TabsLayout;
