import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import { Link, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { logout } from "../../lib/appwrite";

const profile = () => {
  const handleLogout = async () => {
    try {
      await logout();
      // Navigate to the sign-in screen after successful logout
      router.push("/sign-in");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };
  return (
    <SafeAreaView className="bg-white h-full">
      <ScrollView>
        <View className="w-full justify-end min-h-[85vh] px-4 my-6">
          <View className="justify-center pt-5 flex-row gap-2">
            <TouchableOpacity onPress={handleLogout}>
              <Text className="text-lg font-psemibold text-tertiary">
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default profile;
