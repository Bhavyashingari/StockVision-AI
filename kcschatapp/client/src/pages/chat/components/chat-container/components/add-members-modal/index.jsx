import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { useAppStore } from "@/store";
import { HOST } from "@/lib/constants";
import  apiClient  from "@/lib/api-client";
import { CHECK_USER_ROUTE } from "@/lib/constants"; // Assuming this is for all users, or we might need a new one
import { toast } from "sonner";
import { getColor } from "@/lib/utils";


const AddMembersModal = ({ isOpen, onClose, channelId, currentMembers }) => {
  const { userInfo, updateChannelDetails } = useAppStore();
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // TODO: Replace with a proper "get all users" endpoint if CHECK_USER_ROUTE is not suitable
        // For now, assuming CHECK_USER_ROUTE can be adapted or a similar endpoint for all users exists.
        // This might be /api/contacts/get-all-contacts as mentioned in the prompt.
        // The prompt suggested `/api/contacts/get-all-contacts`
        const response = await apiClient.get("/contacts/get-all-contacts", {
          headers: {
            Authorization: `Bearer ${userInfo.token}`, // Assuming token is needed
          },
        });
        if (response.data && response.data.users) {
          setAllUsers(response.data.users);
        } else {
          setAllUsers([]); // Ensure it's an array
          console.error("Failed to fetch users or users format is incorrect:", response.data);
          toast.error("Failed to fetch users.");
        }
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Error fetching users.");
        setAllUsers([]); // Ensure it's an array even on error
      }
    };

    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, userInfo?.token]);

  useEffect(() => {
    if (!Array.isArray(allUsers) || !Array.isArray(currentMembers)) {
      setFilteredUsers([]);
      return;
    }

    const currentMemberIds = new Set(currentMembers.map(member => member._id));
    let users = allUsers.filter(user => !currentMemberIds.has(user._id) && user._id !== userInfo.id);

    if (searchTerm) {
      users = users.filter(user =>
        (user.firstName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (user.lastName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredUsers(users);
  }, [allUsers, currentMembers, searchTerm, userInfo?.id]);

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one member to add.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiClient.post(
        `/channels/${channelId}/members`,
        { memberIds: selectedUsers },
        {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        }
      );

      if (response.status === 200 && response.data.channel) {
        toast.success("Members added successfully!");
        updateChannelDetails(response.data.channel);
        onClose();
        setSelectedUsers([]);
        setSearchTerm("");
      } else {
        toast.error(response.data?.message || "Failed to add members.");
      }
    } catch (error) {
      console.error("Error adding members:", error);
      toast.error(error.response?.data?.message || "An error occurred while adding members.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-[#1c1d21] border-none text-white">
        <DialogHeader>
          <DialogTitle>Add Members to Channel</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#2f303b] border-none placeholder-neutral-400"
          />
          <ScrollArea className="h-[300px] w-full pr-4">
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <div key={user._id} className="flex items-center justify-between p-2 hover:bg-[#2f303b] rounded-md">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 rounded-full overflow-hidden">
                      {user.image ? (
                        <AvatarImage
                          src={`${HOST}/${user.image}`}
                          alt="profile"
                          className="object-cover w-full h-full bg-black rounded-full"
                        />
                      ) : (
                        <div
                          className={`uppercase w-10 h-10 text-sm border-[1px] ${getColor(user.color)} flex items-center justify-center rounded-full`}
                        >
                          {user.firstName ? user.firstName.split("").shift() : user.email.split("").shift()}
                        </div>
                      )}
                    </Avatar>
                    <span>{user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user.email}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user._id)}
                    onChange={() => handleSelectUser(user._id)}
                    className="form-checkbox h-5 w-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                </div>
              ))
            ) : (
              <p className="text-neutral-400 text-center">No users available to add.</p>
            )}
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="bg-gray-600 hover:bg-gray-500">
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isLoading || selectedUsers.length === 0} className="bg-green-600 hover:bg-green-500">
            {isLoading ? "Adding..." : "Add Selected Members"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddMembersModal;
